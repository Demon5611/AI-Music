import type {
  MusicGenerationRecordDto,
  MusicGenerationRecordStatus,
  MusicGenerationTrackDto,
  MusicStatusResponseDto,
} from "@ai-music/shared";
import type {
  GeneratedTrack,
  GenerationStatusResult,
  GeneratedLyrics,
} from "@ai-music/ai-providers";
import type { MusicGeneration, MusicGenerationTrack } from "@ai-music/db";

type MusicGenerationWithTracks = MusicGeneration & {
  tracks: MusicGenerationTrack[];
};

export function toMusicGenerationRecordDto(
  record: MusicGenerationWithTracks,
  apiBaseUrl: string,
): MusicGenerationRecordDto {
  return {
    id: record.id,
    type: record.type as MusicGenerationRecordDto["type"],
    providerTaskId: record.providerTaskId,
    prompt: record.prompt,
    style: record.style,
    title: record.title,
    customMode: record.customMode,
    instrumental: record.instrumental,
    status: record.status as MusicGenerationRecordStatus,
    rawStatus: record.rawStatus,
    errorMessage: record.errorMessage,
    lyrics: parseLyricsResult(record.lyricsResult),
    tracks: record.tracks.map((track) => toMusicTrackDto(track, apiBaseUrl)),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function toMusicStatusResponse(
  status: GenerationStatusResult,
  record: MusicGenerationWithTracks | null,
  apiBaseUrl: string,
): MusicStatusResponseDto {
  return {
    recordId: record?.id ?? null,
    taskId: status.taskId,
    status: status.status,
    provider: status.provider,
    rawStatus: status.rawStatus,
    tracks: status.tracks?.map((track) => {
      const stored = record?.tracks.find(
        (item) => item.providerTrackId === track.id,
      );

      return {
        id: stored?.id ?? track.id,
        providerTrackId: track.id,
        canDelete: Boolean(stored?.id),
        title: track.title,
        audioUrl: resolveTrackPlaybackUrl(record, track, apiBaseUrl),
        imageUrl: track.imageUrl,
        durationSec: track.durationSec,
        lyricsText: track.lyricsText,
      };
    }),
    lyrics: status.lyrics,
    errorMessage: status.errorMessage,
  };
}

function toMusicTrackDto(
  track: MusicGenerationTrack,
  apiBaseUrl: string,
): MusicGenerationTrackDto {
  return {
    id: track.id,
    providerTrackId: track.providerTrackId,
    title: track.title,
    durationSec: track.durationSec,
    audioUrl: track.audioStorageKey
      ? `${apiBaseUrl}/api/music/tracks/${track.id}/audio`
      : track.audioSourceUrl,
    imageUrl: track.imageSourceUrl,
    lyricsText: track.lyricsText,
  };
}

function resolveTrackPlaybackUrl(
  record: MusicGenerationWithTracks | null,
  providerTrack: GeneratedTrack,
  apiBaseUrl: string,
): string {
  const stored = record?.tracks.find(
    (track) => track.providerTrackId === providerTrack.id,
  );

  if (stored?.audioStorageKey) {
    return `${apiBaseUrl}/api/music/tracks/${stored.id}/audio`;
  }

  return providerTrack.audioUrl || providerTrack.streamAudioUrl || "";
}

function parseLyricsResult(
  value: unknown,
): Array<{ title: string; text: string }> | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .filter(
      (item): item is GeneratedLyrics =>
        typeof item === "object" &&
        item !== null &&
        "title" in item &&
        "text" in item,
    )
    .map((item) => ({ title: item.title, text: item.text }));
}
