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
import {
  buildPersonaSongInput,
  resolveMusicPersonaForUser,
  type MusicGenerateLogger,
} from "./music-persona.js";
import { ForbiddenError, BadRequestError } from "../../common/errors.js";
import { refundCredits, spendCredits } from "../credits/service.js";
import {
  assertFeature,
  assertMaxDuration,
  assertMusicGenerationMode,
} from "../billing/entitlements.service.js";
import { prisma } from "@ai-music/db";
import {
  buildGenderAwareLyricsPrompt,
  checkContentAllowed,
  CONTENT_MODERATION_ERROR_RU,
  GENERATION_CREDIT_COST,
  isVocalGender,
  resolveLyricsBriefMaxLength,
  SUNO_LYRICS_PROMPT_MAX_LENGTH,
} from "@ai-music/shared";

const musicService = createMusicService();
const CONTENT_MODERATION_ERROR_CODE = "CONTENT_MODERATION";

function assertModerationForNonEmptyText(value: string): void {
  const trimmed = value.trim();
  if (!trimmed) {
    return;
  }

  const moderationResult = checkContentAllowed(trimmed);
  if (!moderationResult.allowed) {
    throw new BadRequestError(moderationResult.reasonMessageRu, CONTENT_MODERATION_ERROR_CODE);
  }
}

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
  options: { voiceSampleId?: string } = {},
  log?: MusicGenerateLogger,
) {
  assertModerationForNonEmptyText(input.prompt);
  assertModerationForNonEmptyText(input.style ?? "");
  assertModerationForNonEmptyText(input.title ?? "");

  const persona = await resolveMusicPersonaForUser(userId, options.voiceSampleId, log);

  if (!persona) {
    throw new ForbiddenError(
      "Голос AI Music не готов. Запишите голос на главной и пройдите верификацию на /consent.",
    );
  }

  if (input.durationSec) {
    await assertMaxDuration(userId, input.durationSec);
  }

  await assertMusicGenerationMode(userId, {
    customMode: input.customMode,
    instrumental: input.instrumental,
  });

  const songInput = buildPersonaSongInput(input, persona);

  log?.info(
    {
      userId,
      voiceSampleId: persona.voiceSampleId,
      personaId: persona.personaId,
      personaModel: persona.personaModel,
      vocalGender: songInput.vocalGender ?? null,
      customMode: songInput.customMode ?? null,
      style: songInput.style ?? null,
      title: songInput.title ?? null,
    },
    "Submitting Suno music generation with persona",
  );

  await spendCredits(userId, GENERATION_CREDIT_COST, "music_generate");

  try {
    const result = await musicService.generateSong(songInput);
    const record = await createMusicGenerationRecord(
      buildSongRecordInput(userId, input, result.taskId),
    );

    return {
      recordId: record.id,
      provider: result.provider,
      taskId: result.taskId,
      status: result.status,
    };
  } catch (error) {
    await refundCredits(
      userId,
      GENERATION_CREDIT_COST,
      `music_generate_failed:${userId}`,
    ).catch(() => undefined);
    throw error;
  }
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

export async function generateLyricsForUser(userId: string, prompt: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { vocalGender: true },
  });
  const vocalGender =
    user?.vocalGender && isVocalGender(user.vocalGender) ? user.vocalGender : null;

  const trimmedPrompt = prompt.trim();
  const briefMaxLength = resolveLyricsBriefMaxLength(vocalGender);

  if (trimmedPrompt.length > briefMaxLength) {
    throw new BadRequestError(
      vocalGender
        ? `Описание слишком длинное — максимум ${briefMaxLength} символов (AI Music учитывает подсказку про род глаголов).`
        : `Описание слишком длинное — максимум ${SUNO_LYRICS_PROMPT_MAX_LENGTH} символов.`,
    );
  }

  assertModerationForNonEmptyText(trimmedPrompt);

  const genderAwarePrompt = buildGenderAwareLyricsPrompt(trimmedPrompt, vocalGender);

  if (genderAwarePrompt.length > SUNO_LYRICS_PROMPT_MAX_LENGTH) {
    throw new BadRequestError(
      `Описание слишком длинное для AI Music — максимум ${briefMaxLength} символов.`,
    );
  }

  assertModerationForNonEmptyText(genderAwarePrompt);

  const result = await musicService.generateLyrics({ prompt: genderAwarePrompt });

  return {
    provider: result.provider,
    taskId: result.taskId,
    status: result.status,
  };
}

export async function getLyricsGenerationStatus(taskId: string) {
  const status = await musicService.getLyricsGenerationStatus(taskId);
  const hasBlockedLyrics =
    status.status === "completed" &&
    (status.lyrics ?? []).some((item) => !checkContentAllowed(item.text).allowed);
  const hasProviderSensitiveWordError = status.rawStatus === "SENSITIVE_WORD_ERROR";
  const moderationBlocked = hasBlockedLyrics || hasProviderSensitiveWordError;

  return {
    taskId: status.taskId,
    status: moderationBlocked ? "failed" : status.status,
    provider: status.provider,
    rawStatus: moderationBlocked ? "CONTENT_MODERATION" : status.rawStatus,
    lyrics: moderationBlocked ? undefined : status.lyrics,
    errorMessage: moderationBlocked ? CONTENT_MODERATION_ERROR_RU : status.errorMessage,
  };
}

export { toMusicGenerationRecordDto };
