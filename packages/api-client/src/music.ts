import type {
  MusicGenerateResponseDto,
  MusicGenerationRecordDto,
  MusicLyricsGenerateResponseDto,
  MusicLyricsStatusResponseDto,
  MusicStatusResponseDto,
  TimedLyricsResponseDto,
} from "@ai-music/shared";
import type { ApiClient } from "./client.js";

export interface GenerateSongBody {
  prompt: string;
  style?: string;
  title?: string;
  instrumental?: boolean;
  customMode?: boolean;
  durationSec?: number;
  referenceAudioUrl?: string;
  vocalGender?: "m" | "f";
  voiceSampleId?: string;
}

export interface GenerateLyricsBody {
  prompt: string;
  durationSec?: number;
}

export function createMusicApi(client: ApiClient) {
  return {
    getTestStatus: () =>
      client.get<{ configured: boolean; provider: string }>("/api/music/test/status"),
    history: () => client.get<MusicGenerationRecordDto[]>("/api/music/history"),
    generate: (body: GenerateSongBody) =>
      client.post<MusicGenerateResponseDto>("/api/music/generate", body),
    generateLyrics: (body: GenerateLyricsBody) =>
      client.post<MusicLyricsGenerateResponseDto>("/api/music/lyrics", body),
    lyricsStatus: (taskId: string, durationSec?: number) => {
      const query =
        durationSec && durationSec > 0
          ? `?durationSec=${encodeURIComponent(String(durationSec))}`
          : "";

      return client.get<MusicLyricsStatusResponseDto>(
        `/api/music/lyrics/status/${encodeURIComponent(taskId)}${query}`,
      );
    },
    status: (taskId: string) => client.get<MusicStatusResponseDto>(`/api/music/status/${taskId}`),
    deleteHistory: (ids: string[]) =>
      client.post<{ deletedCount: number }>("/api/music/history/delete", {
        ids,
      }),
    deleteTrack: (trackId: string) =>
      client.delete<{ deleted: boolean }>(`/api/music/tracks/${trackId}`),
    getTimedLyrics: (trackId: string) =>
      client.get<TimedLyricsResponseDto>(
        `/api/music/tracks/${encodeURIComponent(trackId)}/timed-lyrics`,
      ),
    fetchTimedLyrics: (trackId: string) =>
      client.post<TimedLyricsResponseDto>(
        `/api/music/tracks/${encodeURIComponent(trackId)}/timed-lyrics`,
        {},
      ),
  };
}
