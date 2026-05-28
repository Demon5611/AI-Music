import {
  createMusicService,
  resolveMusicProviderConfig,
  resolveMusicProviderId,
} from "@ai-music/ai-providers";
import type { GenerateSongInput } from "@ai-music/ai-providers";
import {
  buildLyricsRecordInput,
  buildSongRecordInput,
  createMusicGenerationRecord,
  deleteMusicGenerationTrack,
  deleteMusicGenerations,
  listMusicGenerationHistory,
  resolveApiBaseUrl,
  syncMusicGenerationRecord,
} from "./music-record.service.js";
import {
  toMusicGenerationRecordDto,
  toMusicStatusResponse,
} from "./music-record.mapper.js";

const musicService = createMusicService();

export function getMusicTestStatus() {
  const config = resolveMusicProviderConfig();

  return {
    provider: resolveMusicProviderId(),
    configured: Boolean(config.sunoApiKey.trim()),
  };
}

export async function generateMusicForUser(
  userId: string,
  input: GenerateSongInput,
) {
  const result = await musicService.generateSong(input);
  const record = await createMusicGenerationRecord(
    buildSongRecordInput(userId, input, result.taskId),
  );

  return {
    recordId: record.id,
    provider: result.provider,
    taskId: result.taskId,
    status: result.status,
  };
}

export async function generateLyricsForUser(userId: string, prompt: string) {
  const result = await musicService.getLyrics({ prompt });
  const record = await createMusicGenerationRecord(
    buildLyricsRecordInput(userId, prompt, result.taskId),
  );

  return {
    recordId: record.id,
    provider: result.provider,
    taskId: result.taskId,
    status: result.status,
  };
}

export async function getMusicGenerationStatusForUser(
  taskId: string,
  userId?: string,
) {
  const status = await musicService.getGenerationStatus(taskId);
  const record = await syncMusicGenerationRecord(taskId, status, userId);
  const apiBaseUrl = resolveApiBaseUrl();

  return toMusicStatusResponse(status, record, apiBaseUrl);
}

export async function getMusicHistory(userId: string) {
  return listMusicGenerationHistory(userId);
}

export async function removeMusicGenerations(userId: string, ids: string[]) {
  return deleteMusicGenerations(userId, ids);
}

export async function removeMusicGenerationTrack(userId: string, trackId: string) {
  return deleteMusicGenerationTrack(userId, trackId);
}

export function extendMusic(input: {
  audioId: string;
  prompt: string;
  continueAtSec: number;
  style?: string;
  title?: string;
}) {
  return musicService.extendSong(input);
}

export { toMusicGenerationRecordDto };
