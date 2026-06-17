import {
  createMusicService,
  resolveMusicProviderConfig,
  resolveMusicProviderId,
} from "@ai-music/ai-providers";
import type { GenerateSongInput } from "@ai-music/ai-providers";
import {
  buildSongRecordInput,
  createMusicGenerationRecord,
  deleteMusicGenerationTrack,
  deleteMusicGenerations,
  listMusicGenerationHistory,
  resolveApiBaseUrl,
  syncMusicGenerationRecord,
} from "./music-record.service.js";
import { toMusicGenerationRecordDto, toMusicStatusResponse } from "./music-record.mapper.js";
import { resolveSunoVoicePersonaForUser } from "../voice-samples/resolve-suno-voice-persona.js";
import { ForbiddenError } from "../../common/errors.js";

const musicService = createMusicService();

export function getMusicTestStatus() {
  const config = resolveMusicProviderConfig();

  return {
    provider: resolveMusicProviderId(),
    configured: Boolean(config.sunoApiKey.trim()),
  };
}

export async function generateMusicForUser(userId: string, input: GenerateSongInput) {
  const persona = await resolveSunoVoicePersonaForUser(userId);

  if (!persona) {
    throw new ForbiddenError(
      "Голос Suno не готов. Запишите голос на главной и пройдите верификацию на /consent.",
    );
  }

  const result = await musicService.generateSong({
    ...input,
    personaId: persona.personaId,
    personaModel: persona.personaModel,
  });
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

export async function getMusicGenerationStatusForUser(taskId: string, userId?: string) {
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

export async function generateLyricsForUser(prompt: string) {
  const result = await musicService.generateLyrics({ prompt });

  return {
    provider: result.provider,
    taskId: result.taskId,
    status: result.status,
  };
}

export async function getLyricsGenerationStatus(taskId: string) {
  const status = await musicService.getLyricsGenerationStatus(taskId);

  return {
    taskId: status.taskId,
    status: status.status,
    provider: status.provider,
    rawStatus: status.rawStatus,
    lyrics: status.lyrics,
    errorMessage: status.errorMessage,
  };
}

export { toMusicGenerationRecordDto };
