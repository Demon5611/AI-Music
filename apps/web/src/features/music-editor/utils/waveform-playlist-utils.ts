import {
  createClipFromSeconds,
  createTrack,
  type ClipTrack,
} from "@waveform-playlist/core";
import type { EditOperation, EditorTrackId, SongRegionDto } from "@ai-music/shared";
import { selectRegionLabel } from "@/features/music-editor/store/audio-editor-store";

export interface TimelineStemSource {
  id: EditorTrackId;
  label: string;
  url: string;
  color: string;
}

export type PendingTimelineOperation =
  | { type: "resize"; regionId: string; startMs: number; endMs: number }
  | {
      type: "resize";
      trackId: EditorTrackId;
      regionId: string;
      startMs: number;
      endMs: number;
    }
  | { type: "move"; regionId: string; targetIndex: number }
  | { type: "move"; trackId: EditorTrackId; regionId: string; targetIndex: number };

export const AUDIO_CONTEXT_OPTIONS = { sampleRate: 48_000 };
export const TRACK_WAVE_HEIGHT = 72;
/** Visual gap between adjacent clips on the timeline layout (seconds). */
export const CLIP_LAYOUT_GAP_SEC = 0.06;
const DEFAULT_SAMPLES_PER_PIXEL = 2048;
const MIN_SAMPLES_PER_PIXEL = 64;
const MAX_SAMPLES_PER_PIXEL = 16_384;
export const FIT_ZOOM_BASE = 100;
const STANDARD_ZOOM_LEVELS = [
  64, 128, 256, 512, 1024, 2048, 4096, 8192, 16_384,
] as const;

export interface TimelineZoomSettings {
  samplesPerPixel: number;
  zoomLevels: number[];
}

function clampZoom(zoom: number): number {
  return Math.min(200, Math.max(10, zoom));
}

function buildTimelineZoomLevels(fitSamplesPerPixel: number): number[] {
  return [...new Set([...STANDARD_ZOOM_LEVELS, fitSamplesPerPixel])].sort(
    (left, right) => left - right,
  );
}

function resolveFitZoomLevelIndex(
  zoomLevels: number[],
  fitSamplesPerPixel: number,
  zoom: number,
): number {
  let fitIndex = zoomLevels.indexOf(fitSamplesPerPixel);

  if (fitIndex < 0) {
    fitIndex = zoomLevels.reduce((bestIndex, level, index, levels) => {
      const currentDistance = Math.abs(levels[bestIndex] - fitSamplesPerPixel);
      const nextDistance = Math.abs(level - fitSamplesPerPixel);
      return nextDistance < currentDistance ? index : bestIndex;
    }, 0);
  }

  const offsetSteps = Math.round((FIT_ZOOM_BASE - clampZoom(zoom)) / 10);
  return Math.min(
    zoomLevels.length - 1,
    Math.max(0, fitIndex + offsetSteps),
  );
}

export function computeFitSamplesPerPixel(
  tracks: ClipTrack[],
  containerWidthPx: number,
): number {
  const durationSec = computeTimelineLayoutDurationSec(tracks);

  if (durationSec <= 0 || containerWidthPx <= 0) {
    return DEFAULT_SAMPLES_PER_PIXEL;
  }

  const sampleRate =
    tracks[0]?.clips[0]?.sampleRate ?? AUDIO_CONTEXT_OPTIONS.sampleRate;
  const fitSamplesPerPixel = (durationSec * sampleRate) / containerWidthPx;

  return Math.min(
    MAX_SAMPLES_PER_PIXEL,
    Math.max(MIN_SAMPLES_PER_PIXEL, Math.round(fitSamplesPerPixel)),
  );
}

export function resolveTimelineZoomSettings(
  tracks: ClipTrack[],
  containerWidthPx: number,
  zoom: number,
): TimelineZoomSettings {
  const fitSamplesPerPixel = computeFitSamplesPerPixel(tracks, containerWidthPx);
  const zoomLevels = buildTimelineZoomLevels(fitSamplesPerPixel);
  const samplesPerPixel =
    containerWidthPx > 0
      ? zoomLevels[resolveFitZoomLevelIndex(zoomLevels, fitSamplesPerPixel, zoom)]
      : DEFAULT_SAMPLES_PER_PIXEL;

  return { samplesPerPixel, zoomLevels };
}

const REGION_TIME_EPSILON_MS = 20;

const REGION_COLORS: Record<SongRegionDto["label"], string> = {
  intro: "#bfdbfe",
  verse: "#bbf7d0",
  chorus: "#fde68a",
  bridge: "#ddd6fe",
  outro: "#fbcfe8",
  custom: "#cbd5e1",
};

export function dbToGain(db: number): number {
  return 10 ** (db / 20);
}

export function computeTimelineLayoutDurationSec(tracks: ClipTrack[]): number {
  let maxEndSample = 0;

  for (const track of tracks) {
    for (const clip of track.clips) {
      maxEndSample = Math.max(
        maxEndSample,
        clip.startSample + clip.durationSamples,
      );
    }
  }

  if (maxEndSample <= 0) {
    return 0;
  }

  const sampleRate =
    tracks[0]?.clips[0]?.sampleRate ?? AUDIO_CONTEXT_OPTIONS.sampleRate;

  return maxEndSample / sampleRate;
}

export function sortRegions(regions: SongRegionDto[]): SongRegionDto[] {
  return regions.slice().sort((left, right) => left.orderIndex - right.orderIndex);
}

export function buildRegionTrack(
  source: TimelineStemSource,
  audioBuffer: AudioBuffer,
  regions: SongRegionDto[],
  operations: EditOperation[],
): ClipTrack {
  let cursorSec = 0;
  const trackRegions = resolveTrackRegions(source.id, regions, operations);
  const clips = trackRegions.map((region) => {
    const durationSec = Math.max((region.endMs - region.startMs) / 1000, 0.1);
    const clip = createClipFromSeconds({
      audioBuffer,
      startTime: cursorSec,
      offset: region.startMs / 1000,
      duration: durationSec,
      gain: 1,
      name: selectRegionLabel(region),
      color: REGION_COLORS[region.label],
    });

    cursorSec += durationSec + CLIP_LAYOUT_GAP_SEC;

    return {
      ...clip,
      id: `${source.id}-${region.id}`,
      color: REGION_COLORS[region.label],
    };
  });

  return createTrack({
    name: source.label,
    clips,
    muted: false,
    soloed: false,
    volume: 1,
    color: source.color,
    height: TRACK_WAVE_HEIGHT,
  });
}

export function parseTimelineClipId(
  clipId: string,
): { trackId: EditorTrackId; regionId: string } | null {
  if (clipId.startsWith("vocal-")) {
    return { trackId: "vocal", regionId: clipId.slice("vocal-".length) };
  }

  if (clipId.startsWith("instrumental-")) {
    return {
      trackId: "instrumental",
      regionId: clipId.slice("instrumental-".length),
    };
  }

  return null;
}

export function resolvePlaylistTrackForEditorTrack(
  tracks: ClipTrack[],
  trackId: EditorTrackId,
  sources: TimelineStemSource[] = [],
): ClipTrack | null {
  const sourceIndex = sources.findIndex((source) => source.id === trackId);

  if (sourceIndex >= 0 && tracks[sourceIndex]) {
    return tracks[sourceIndex];
  }

  return (
    tracks.find((track) =>
      track.clips.some((clip) => parseTimelineClipId(clip.id)?.trackId === trackId),
    ) ?? null
  );
}

function extractRegionId(clipId: string): string | null {
  return parseTimelineClipId(clipId)?.regionId ?? null;
}

export function resolveTrackRegions(
  trackId: EditorTrackId,
  regions: SongRegionDto[],
  operations: EditOperation[],
): SongRegionDto[] {
  const trackRegions = sortRegions(regions).map((region) => ({ ...region }));

  for (const operation of operations) {
    if (!("trackId" in operation) || operation.trackId !== trackId) {
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

export function mirrorRegionClipEdits(tracks: ClipTrack[]): ClipTrack[] {
  const clipGeometry = new Map<
    string,
    Pick<ClipTrack["clips"][number], "durationSamples" | "offsetSamples" | "startSample">
  >();

  tracks.forEach((track) => {
    track.clips.forEach((clip) => {
      const regionId = extractRegionId(clip.id);

      if (regionId) {
        clipGeometry.set(regionId, {
          durationSamples: clip.durationSamples,
          offsetSamples: clip.offsetSamples,
          startSample: clip.startSample,
        });
      }
    });
  });

  return tracks.map((track) => ({
    ...track,
    clips: track.clips.map((clip) => {
      const regionId = extractRegionId(clip.id);
      const geometry = regionId ? clipGeometry.get(regionId) : null;

      return geometry ? { ...clip, ...geometry } : clip;
    }),
  }));
}

function findMovedRegion(
  oldOrder: string[],
  newOrder: string[],
): { regionId: string; targetIndex: number } | null {
  if (
    oldOrder.length !== newOrder.length ||
    oldOrder.every((regionId, index) => regionId === newOrder[index])
  ) {
    return null;
  }

  for (const regionId of oldOrder) {
    const fromIndex = oldOrder.indexOf(regionId);
    const targetIndex = newOrder.indexOf(regionId);

    if (targetIndex < 0 || fromIndex === targetIndex) {
      continue;
    }

    const candidate = oldOrder.slice();
    const [moved] = candidate.splice(fromIndex, 1);
    candidate.splice(targetIndex, 0, moved);

    if (candidate.every((id, index) => id === newOrder[index])) {
      return { regionId, targetIndex };
    }
  }

  return null;
}

export function resolveTimelineOperation(
  tracks: ClipTrack[],
  regions: SongRegionDto[],
  operations: EditOperation[],
  linkedTracks: boolean,
): PendingTimelineOperation | null {
  const regionsByTrack = new Map<EditorTrackId, Map<string, SongRegionDto>>();

  for (const trackId of ["vocal", "instrumental"] as const) {
    regionsByTrack.set(
      trackId,
      new Map(
        resolveTrackRegions(trackId, regions, operations).map((region) => [
          region.id,
          region,
        ]),
      ),
    );
  }

  for (const track of tracks) {
    for (const clip of track.clips) {
      const clipRef = parseTimelineClipId(clip.id);

      if (!clipRef) {
        continue;
      }

      const region = regionsByTrack.get(clipRef.trackId)?.get(clipRef.regionId);

      if (!region) {
        continue;
      }

      const startMs = Math.round((clip.offsetSamples / clip.sampleRate) * 1000);
      const endMs = Math.round(
        ((clip.offsetSamples + clip.durationSamples) / clip.sampleRate) * 1000,
      );

      if (
        Math.abs(startMs - region.startMs) > REGION_TIME_EPSILON_MS ||
        Math.abs(endMs - region.endMs) > REGION_TIME_EPSILON_MS
      ) {
        return linkedTracks
          ? { type: "resize", regionId: clipRef.regionId, startMs, endMs }
          : {
              type: "resize",
              trackId: clipRef.trackId,
              regionId: clipRef.regionId,
              startMs,
              endMs,
            };
      }
    }
  }

  for (const track of tracks) {
    const firstClipRef = track.clips[0] ? parseTimelineClipId(track.clips[0].id) : null;

    if (!firstClipRef) {
      continue;
    }

    const newOrder = track.clips
      .slice()
      .sort((left, right) => left.startSample - right.startSample)
      .map((clip) => extractRegionId(clip.id))
      .filter((regionId): regionId is string => Boolean(regionId));
    const oldOrder = resolveTrackRegions(
      firstClipRef.trackId,
      regions,
      operations,
    ).map((region) => region.id);
    const movedRegion = findMovedRegion(oldOrder, newOrder);

    if (!movedRegion) {
      continue;
    }

    return linkedTracks
      ? { type: "move", ...movedRegion }
      : { type: "move", trackId: firstClipRef.trackId, ...movedRegion };
  }

  return null;
}
