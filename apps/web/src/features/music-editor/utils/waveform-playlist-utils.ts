import {
  createClipFromSeconds,
  createTrack,
  type ClipTrack,
} from "@waveform-playlist/core";
import type { EditorTrackId, SongRegionDto } from "@ai-music/shared";
import { selectRegionLabel } from "@/features/music-editor/store/audio-editor-store";

export interface TimelineStemSource {
  id: EditorTrackId;
  label: string;
  url: string;
  color: string;
}

export type PendingTimelineOperation =
  | { type: "resize"; regionId: string; startMs: number; endMs: number }
  | { type: "move"; regionId: string; targetIndex: number };

export const AUDIO_CONTEXT_OPTIONS = { sampleRate: 48_000 };

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

export function sortRegions(regions: SongRegionDto[]): SongRegionDto[] {
  return regions.slice().sort((left, right) => left.orderIndex - right.orderIndex);
}

export function buildRegionTrack(
  source: TimelineStemSource,
  audioBuffer: AudioBuffer,
  regions: SongRegionDto[],
): ClipTrack {
  let cursorSec = 0;
  const clips = sortRegions(regions).map((region) => {
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

    cursorSec += durationSec;

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
    height: 96,
  });
}

function extractRegionId(clipId: string): string | null {
  if (clipId.startsWith("vocal-")) {
    return clipId.slice("vocal-".length);
  }

  if (clipId.startsWith("instrumental-")) {
    return clipId.slice("instrumental-".length);
  }

  return null;
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
): PendingTimelineOperation | null {
  const regionById = new Map(regions.map((region) => [region.id, region]));

  for (const track of tracks) {
    for (const clip of track.clips) {
      const regionId = extractRegionId(clip.id);

      if (!regionId) {
        continue;
      }

      const region = regionById.get(regionId);

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
        return { type: "resize", regionId, startMs, endMs };
      }
    }
  }

  const sortableTrack = tracks.find((track) => track.clips.length > 0);
  const newOrder = sortableTrack?.clips
    .slice()
    .sort((left, right) => left.startSample - right.startSample)
    .map((clip) => extractRegionId(clip.id))
    .filter((regionId): regionId is string => Boolean(regionId));
  const oldOrder = sortRegions(regions).map((region) => region.id);
  const movedRegion = newOrder ? findMovedRegion(oldOrder, newOrder) : null;

  return movedRegion ? { type: "move", ...movedRegion } : null;
}
