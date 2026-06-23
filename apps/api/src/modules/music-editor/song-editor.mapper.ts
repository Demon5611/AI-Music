import type {
  EditOperation,
  EditorStateDto,
  EditorTrackId,
  SongDto,
  SongRegionDto,
  SongRegionLabel,
  SongStemDto,
  SongVersionDto,
} from "@ai-music/shared";
import { normalizeLegacyEditOperation } from "@ai-music/shared";
import type { Prisma, Song, SongRegion, SongStem, SongVersion } from "@ai-music/db";
import { resolveApiBaseUrl } from "../music/music-record.service.js";

export type DbEditOperation = Prisma.EditOperationGetPayload<object>;

export type SongVersionWithOperations = SongVersion & {
  operations: DbEditOperation[];
};

type SongWithRelations = Song & {
  stems: SongStem[];
  regions: SongRegion[];
  versions: SongVersionWithOperations[];
};

const REGION_LAYOUT: Array<{ label: SongRegionLabel; ratio: number }> = [
  { label: "intro", ratio: 0.1 },
  { label: "verse", ratio: 0.25 },
  { label: "chorus", ratio: 0.25 },
  { label: "bridge", ratio: 0.2 },
  { label: "outro", ratio: 0.2 },
];

export function buildDefaultRegions(durationMs: number): Array<{
  label: SongRegionLabel;
  startMs: number;
  endMs: number;
  orderIndex: number;
}> {
  let cursor = 0;

  return REGION_LAYOUT.map((item, index) => {
    const lengthMs =
      index === REGION_LAYOUT.length - 1
        ? durationMs - cursor
        : Math.round(durationMs * item.ratio);
    const startMs = cursor;
    const endMs = Math.min(durationMs, cursor + lengthMs);
    cursor = endMs;

    return {
      label: item.label,
      startMs,
      endMs,
      orderIndex: index,
    };
  });
}

function buildSongAudioUrl(song: Song, apiBaseUrl: string): string | null {
  if (!song.audioStorageKey) {
    return null;
  }

  return `${apiBaseUrl}/api/music/songs/${song.id}/audio/original`;
}

function buildStemAudioUrl(songId: string, stemType: string, apiBaseUrl: string): string {
  return `${apiBaseUrl}/api/music/songs/${songId}/stems/${stemType}/audio`;
}

function buildRenderAudioUrl(songId: string, versionId: string, apiBaseUrl: string): string {
  return `${apiBaseUrl}/api/music/songs/${songId}/versions/${versionId}/audio`;
}

function toSongDto(song: Song, apiBaseUrl: string): SongDto {
  return {
    id: song.id,
    title: song.title,
    prompt: song.prompt,
    status: song.status as SongDto["status"],
    durationMs: song.durationMs,
    audioUrl: buildSongAudioUrl(song, apiBaseUrl),
    sourceTrackId: song.sourceTrackId,
    stemSeparationNotice: song.stemSeparationNotice,
    createdAt: song.createdAt.toISOString(),
    updatedAt: song.updatedAt.toISOString(),
  };
}

function toStemDtos(song: SongWithRelations, apiBaseUrl: string): SongStemDto[] {
  return song.stems.map((stem) => ({
    id: stem.id,
    type: stem.type as SongStemDto["type"],
    audioUrl: buildStemAudioUrl(song.id, stem.type, apiBaseUrl),
    durationMs: stem.durationMs,
  }));
}

function toRegionDtos(regions: SongRegion[]): SongRegionDto[] {
  return regions
    .slice()
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .map((region) => ({
      id: region.id,
      label: region.label as SongRegionLabel,
      startMs: region.startMs,
      endMs: region.endMs,
      orderIndex: region.orderIndex,
    }));
}

function toVersionDtos(
  songId: string,
  versions: SongVersion[],
  apiBaseUrl: string,
): SongVersionDto[] {
  return versions
    .slice()
    .sort((left, right) => right.versionNumber - left.versionNumber)
    .map((version) => ({
      id: version.id,
      versionNumber: version.versionNumber,
      status: version.status,
      renderedAudioUrl: version.renderedAudioKey
        ? buildRenderAudioUrl(songId, version.id, apiBaseUrl)
        : null,
      createdAt: version.createdAt.toISOString(),
    }));
}

function stripUndoMeta(operation: EditOperation): EditOperation {
  if (!("undoMeta" in operation)) {
    return operation;
  }

  const { undoMeta: _removed, ...cleanOperation } = operation as EditOperation & {
    undoMeta?: unknown;
  };

  return cleanOperation;
}

function isStoredEditOperation(value: unknown): value is EditOperation {
  if (!value || typeof value !== "object" || !("type" in value)) {
    return false;
  }

  return (value as { type: string }).type !== "REPLACE_VOCAL"
    && (value as { type: string }).type !== "REPLACE_SECTION";
}

export function parseOperations(operations: DbEditOperation[]): EditOperation[] {
  return operations
    .filter((operation) => operation.undoneAt === null)
    .map((operation) =>
      normalizeLegacyEditOperation(
        stripUndoMeta(operation.payloadJson as unknown as EditOperation),
      ),
    )
    .filter(isStoredEditOperation);
}

function parseUndoneOperations(operations: DbEditOperation[]): EditOperation[] {
  return operations
    .filter((operation) => operation.undoneAt !== null)
    .slice()
    .sort((left, right) => {
      const leftTime = left.undoneAt?.getTime() ?? 0;
      const rightTime = right.undoneAt?.getTime() ?? 0;
      return rightTime - leftTime;
    })
    .map((operation) =>
      normalizeLegacyEditOperation(
        stripUndoMeta(operation.payloadJson as unknown as EditOperation),
      ),
    )
    .filter(isStoredEditOperation);
}

function computeTrackState(
  trackId: EditorTrackId,
  operations: EditOperation[],
): { muted: boolean; gainDb: number } {
  let muted = false;
  let gainDb = 0;

  for (const operation of operations) {
    if ("trackId" in operation && operation.trackId === trackId) {
      if (operation.type === "SET_VOLUME") {
        gainDb = operation.gainDb;
      }

      if (operation.type === "MUTE_TRACK") {
        muted = operation.muted;
      }
    }
  }

  return { muted, gainDb };
}

export function toEditorStateDto(
  song: SongWithRelations,
  currentVersion: SongVersion & { operations: DbEditOperation[] },
): EditorStateDto {
  const apiBaseUrl = resolveApiBaseUrl();
  const operations = parseOperations(currentVersion.operations);
  const undoneOperations = parseUndoneOperations(currentVersion.operations);
  const stemByType = new Map(song.stems.map((stem) => [stem.type, stem]));

  const tracks = (["vocal", "instrumental"] as const).map((trackId) => {
    const stem = stemByType.get(trackId);
    const state = computeTrackState(trackId, operations);

    return {
      id: trackId,
      label: trackId === "vocal" ? "Vocal" : "Instrumental",
      stemId: stem?.id ?? null,
      audioUrl: stem ? buildStemAudioUrl(song.id, trackId, apiBaseUrl) : null,
      muted: state.muted,
      gainDb: state.gainDb,
    };
  });

  return {
    song: toSongDto(song, apiBaseUrl),
    stems: toStemDtos(song, apiBaseUrl),
    regions: toRegionDtos(song.regions),
    tracks,
    operations,
    undoneOperations,
    currentVersionId: currentVersion.id,
    versions: toVersionDtos(song.id, song.versions, apiBaseUrl),
  };
}

export function toRenderJobDto(job: {
  id: string;
  songId: string;
  songVersionId: string;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: job.id,
    songId: job.songId,
    songVersionId: job.songVersionId,
    status: job.status,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}
