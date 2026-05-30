import type { EditOperation, SongRegionDto } from "../types/music-editor.js";

const SPLIT_EDGE_PADDING_MS = 100;
const CLIP_LAYOUT_GAP_MS = 60;

interface RegionLayoutRange {
  regionId: string;
  layoutStartMs: number;
  layoutEndMs: number;
}

function sortRegions(regions: SongRegionDto[]): SongRegionDto[] {
  return regions.slice().sort((left, right) => left.orderIndex - right.orderIndex);
}

function resolveTrackRegions(
  regions: SongRegionDto[],
  operations: EditOperation[],
): SongRegionDto[] {
  const trackRegions = sortRegions(regions).map((region) => ({ ...region }));

  for (const operation of operations) {
    if (!("trackId" in operation)) {
      continue;
    }

    if (operation.type === "RESIZE_TRACK_REGION") {
      const region = trackRegions.find((item) => item.id === operation.regionId);

      if (region) {
        region.startMs = operation.startMs;
        region.endMs = operation.endMs;
      }
    }

    if (operation.type === "MOVE_TRACK_REGION") {
      const fromIndex = trackRegions.findIndex(
        (item) => item.id === operation.regionId,
      );

      if (fromIndex < 0) {
        continue;
      }

      const targetIndex = Math.min(operation.targetIndex, trackRegions.length - 1);
      const [moved] = trackRegions.splice(fromIndex, 1);
      trackRegions.splice(targetIndex, 0, moved);
      trackRegions.forEach((region, index) => {
        region.orderIndex = index;
      });
    }
  }

  return trackRegions;
}

function buildRegionLayoutRanges(
  regions: SongRegionDto[],
  operations: EditOperation[],
): RegionLayoutRange[] {
  const trackRegions = resolveTrackRegions(regions, operations);
  let cursorMs = 0;

  return trackRegions.map((region) => {
    const durationMs = Math.max(region.endMs - region.startMs, 100);
    const layoutStartMs = cursorMs;
    const layoutEndMs = cursorMs + durationMs;

    cursorMs = layoutEndMs + CLIP_LAYOUT_GAP_MS;

    return {
      regionId: region.id,
      layoutStartMs,
      layoutEndMs,
    };
  });
}

export function computeRegionLayoutRangeMs(
  regions: SongRegionDto[],
  operations: EditOperation[],
  regionId: string,
): { layoutStartMs: number; layoutEndMs: number } | null {
  const match = buildRegionLayoutRanges(regions, operations).find(
    (item) => item.regionId === regionId,
  );

  if (!match) {
    return null;
  }

  return {
    layoutStartMs: match.layoutStartMs,
    layoutEndMs: match.layoutEndMs,
  };
}

export function findRegionAtLayoutMs(
  regions: SongRegionDto[],
  operations: EditOperation[],
  layoutMs: number,
): RegionLayoutRange | null {
  for (const range of buildRegionLayoutRanges(regions, operations)) {
    if (layoutMs >= range.layoutStartMs && layoutMs < range.layoutEndMs) {
      return range;
    }
  }

  return null;
}

export function resolveSplitAtMsFromLayoutPlayhead(
  region: SongRegionDto,
  layoutStartMs: number,
  layoutEndMs: number,
  playheadLayoutMs: number,
): { splitAtMs: number } | { error: string } {
  const layoutDurationMs = layoutEndMs - layoutStartMs;
  const sourceDurationMs = region.endMs - region.startMs;

  if (layoutDurationMs <= 0 || sourceDurationMs <= 0) {
    return { error: "Region is too short for split" };
  }

  if (playheadLayoutMs <= layoutStartMs || playheadLayoutMs >= layoutEndMs) {
    return {
      error: "Playhead must be inside the selected region on the timeline",
    };
  }

  const ratio = (playheadLayoutMs - layoutStartMs) / layoutDurationMs;
  const splitAtMs = Math.round(region.startMs + ratio * sourceDurationMs);

  if (
    splitAtMs <= region.startMs + SPLIT_EDGE_PADDING_MS ||
    splitAtMs >= region.endMs - SPLIT_EDGE_PADDING_MS
  ) {
    return {
      error: "Playhead is too close to the region edge for split",
    };
  }

  return { splitAtMs };
}

export function resolveSplitAtMsForEditor(
  regions: SongRegionDto[],
  operations: EditOperation[],
  region: SongRegionDto,
  playheadLayoutMs: number,
): { splitAtMs: number } | { error: string } {
  const layout = computeRegionLayoutRangeMs(regions, operations, region.id);

  if (!layout) {
    return { error: "Unable to resolve region layout on timeline" };
  }

  return resolveSplitAtMsFromLayoutPlayhead(
    region,
    layout.layoutStartMs,
    layout.layoutEndMs,
    playheadLayoutMs,
  );
}
