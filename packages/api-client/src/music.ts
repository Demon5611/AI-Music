import type {
  MusicGenerateResponseDto,
  MusicGenerationRecordDto,
  MusicStatusResponseDto,
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
}

export function createMusicApi(client: ApiClient) {
  return {
    getTestStatus: () =>
      client.get<{ configured: boolean; provider: string }>("/api/music/test/status"),
    history: () => client.get<MusicGenerationRecordDto[]>("/api/music/history"),
    generate: (body: GenerateSongBody) =>
      client.post<MusicGenerateResponseDto>("/api/music/generate", body),
    status: (taskId: string) => client.get<MusicStatusResponseDto>(`/api/music/status/${taskId}`),
    deleteHistory: (ids: string[]) =>
      client.post<{ deletedCount: number }>("/api/music/history/delete", {
        ids,
      }),
    deleteTrack: (trackId: string) =>
      client.delete<{ deleted: boolean }>(`/api/music/tracks/${trackId}`),
  };
}
