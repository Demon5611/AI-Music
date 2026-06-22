import {
  createMusicService,
  resolveMusicProviderConfig,
  resolveMusicProviderId,
} from "@ai-music/ai-providers";
import { randomUUID } from "node:crypto";
import type { GenerateSongInput } from "@ai-music/ai-providers";
import {
  createMusicGenerationRecord,
  deleteMusicGenerationTrack,
  deleteMusicGenerations,
  listMusicGenerationHistory,
  resolveApiBaseUrl,
  syncMusicGenerationRecord,
} from "./music-record.service.js";
import { toMusicGenerationRecordDto, toMusicStatusResponse } from "./music-record.mapper.js";
import { resolveMusicQueueEtaSec, resolveMusicQueuePhase } from "./music-queue-meta.js";
import {
  buildPersonaSongInput,
  resolveMusicPersonaForUser,
  type MusicGenerateLogger,
} from "./music-persona.js";
import { BadRequestError, ForbiddenError, NotFoundError, ServiceUnavailableError } from "../../common/errors.js";
import { refundCredits, refundCreditsOnce, spendCredits } from "../credits/service.js";
import {
  assertMaxDuration,
  assertMusicGenerationMode,
  getQueuePriorityForUser,
  getUserEntitlements,
} from "../billing/entitlements.service.js";
import { enqueueProviderJob } from "../queue/provider-job-queue.js";
import { assertProviderQueueCapacity, getProviderQueueMetrics } from "../queue/provider-queue-metrics.js";
import {
  buildDurationAwareLyricsGenerationPrompt,
  checkContentAllowed,
  CONTENT_MODERATION_ERROR_RU,
  isVocalGender,
  OPERATION_COST_UNITS,
  resolveEffectiveDurationSecForPlan,
  resolveLyricsBriefMaxLength,
  resolveLyricsDurationSecForPlan,
  resolveManualLyricsMaxLength,
  SUNO_LYRICS_PROMPT_MAX_LENGTH,
  truncateLyricsForDuration,
} from "@ai-music/shared";
import { prisma, Prisma } from "@ai-music/db";

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

export async function getMusicOpsStatus() {
  const base = getMusicTestStatus();
  const queue = await getProviderQueueMetrics();

  return {
    ...base,
    providerQueue: queue,
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

  const entitlements = await getUserEntitlements(userId);
  const effectiveDurationSec = resolveEffectiveDurationSecForPlan(
    entitlements.planId,
    input.durationSec ?? 0,
  );

  await assertMaxDuration(userId, effectiveDurationSec);

  await assertMusicGenerationMode(userId, {
    customMode: input.customMode,
    instrumental: input.instrumental,
    style: input.style,
    durationSec: input.durationSec ?? 0,
  });

  await assertLyricsTextLengthForUser(userId, input.prompt, input.durationSec ?? 0);

  const songInput = buildPersonaSongInput(
    { ...input, durationSec: effectiveDurationSec },
    persona,
  );

  log?.info(
    {
      userId,
      voiceSampleId: persona.voiceSampleId,
      personaId: persona.personaId,
      sunoVoiceTaskId: persona.sunoVoiceTaskId,
      personaModel: persona.personaModel,
      sunoVoiceModel: resolveMusicProviderConfig().sunoVoiceModel,
      customMode: songInput.customMode ?? null,
      style: songInput.style ?? null,
      title: songInput.title ?? null,
    },
    "Submitting Suno music generation with persona",
  );

  await assertProviderQueueCapacity();
  await spendCredits(userId, OPERATION_COST_UNITS.generateTrack, "music_generate");

  const queuePlaceholder = `queue:${randomUUID()}`;

  const record = await createMusicGenerationRecord({
    userId,
    type: "song",
    providerTaskId: queuePlaceholder,
    prompt: input.prompt,
    style: input.style,
    title: input.title,
    customMode: input.customMode,
    instrumental: input.instrumental,
  });

  try {
    const priority = await getQueuePriorityForUser(userId);

    await enqueueProviderJob(
      {
        type: "music_generate",
        userId,
        recordId: record.id,
        songInputJson: JSON.stringify(songInput),
        spendReason: `music_generate:${record.id}`,
      },
      priority,
    );

    return {
      recordId: record.id,
      provider: resolveMusicProviderId(),
      taskId: record.id,
      status: "pending" as const,
    };
  } catch (error) {
    await prisma.musicGeneration.update({
      where: { id: record.id },
      data: {
        status: "failed",
        errorMessage: "Failed to enqueue music generation",
      },
    });

    await refundCredits(
      userId,
      OPERATION_COST_UNITS.generateTrack,
      `music_generate_failed:${record.id}`,
    ).catch(() => undefined);
    throw error;
  }
}

export async function getMusicGenerationStatusForUser(taskOrRecordId: string, userId?: string) {
  const record = await findMusicGenerationRecord(taskOrRecordId, userId);

  if (!record) {
    throw new NotFoundError("Music generation not found");
  }

  const apiBaseUrl = resolveApiBaseUrl();
  const queueMetrics = await getProviderQueueMetrics();

  if (record.providerTaskId.startsWith("queue:")) {
    const queuePhase = resolveMusicQueuePhase(record, {
      taskId: record.id,
      status: "pending",
      provider: resolveMusicProviderId(),
      rawStatus: "QUEUED",
    });

    return toMusicStatusResponse(
      {
        taskId: record.id,
        status: "pending",
        provider: resolveMusicProviderId(),
        rawStatus: "QUEUED",
      },
      record,
      apiBaseUrl,
      {
        queuePhase,
        queueEtaSec: resolveMusicQueueEtaSec(queuePhase, queueMetrics.waiting),
      },
    );
  }

  if (record.status === "failed") {
    const failedStatus = {
      taskId: record.providerTaskId,
      status: "failed" as const,
      provider: resolveMusicProviderId(),
      errorMessage: record.errorMessage ?? undefined,
      rawStatus: record.rawStatus ?? undefined,
    };

    return toMusicStatusResponse(failedStatus, record, apiBaseUrl, {
      queuePhase: resolveMusicQueuePhase(record, failedStatus),
    });
  }

  const status = await musicService.getGenerationStatus(record.providerTaskId);
  const synced = await syncMusicGenerationRecord(record.providerTaskId, status, userId);
  const resolvedRecord = synced ?? record;
  const queuePhase = resolveMusicQueuePhase(resolvedRecord, status);

  return toMusicStatusResponse(status, resolvedRecord, apiBaseUrl, {
    queuePhase,
    queueEtaSec:
      queuePhase === "queued"
        ? resolveMusicQueueEtaSec(queuePhase, queueMetrics.waiting)
        : undefined,
  });
}

async function findMusicGenerationRecord(id: string, userId?: string) {
  const scopedUser = userId ? { userId } : {};

  const byId = await prisma.musicGeneration.findFirst({
    where: { id, ...scopedUser },
    include: { tracks: true },
  });

  if (byId) {
    return byId;
  }

  return prisma.musicGeneration.findFirst({
    where: { providerTaskId: id, ...scopedUser },
    include: { tracks: true },
  });
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

export async function generateLyricsForUser(
  userId: string,
  prompt: string,
  durationSec?: number,
) {
  const entitlements = await getUserEntitlements(userId);
  const lyricsDurationSec = resolveLyricsDurationSecForPlan(
    entitlements.planId,
    durationSec ?? 0,
  );

  if (durationSec && durationSec > 0) {
    await assertMaxDuration(userId, durationSec);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { vocalGender: true },
  });
  const vocalGender =
    user?.vocalGender && isVocalGender(user.vocalGender) ? user.vocalGender : null;

  const trimmedPrompt = prompt.trim();
  const briefMaxLength = resolveLyricsBriefMaxLength(vocalGender, lyricsDurationSec);

  if (trimmedPrompt.length > briefMaxLength) {
    throw new BadRequestError(
      vocalGender
        ? `Описание слишком длинное — максимум ${briefMaxLength} символов (AI Music учитывает подсказки про длительность и род глаголов).`
        : `Описание слишком длинное — максимум ${briefMaxLength} символов (AI Music учитывает подсказку про длительность).`,
    );
  }

  assertModerationForNonEmptyText(trimmedPrompt);

  const providerPrompt = buildDurationAwareLyricsGenerationPrompt(
    trimmedPrompt,
    vocalGender,
    lyricsDurationSec,
  );

  if (providerPrompt.length > SUNO_LYRICS_PROMPT_MAX_LENGTH) {
    throw new BadRequestError(
      `Описание слишком длинное для AI Music — максимум ${briefMaxLength} символов.`,
    );
  }

  assertModerationForNonEmptyText(providerPrompt);

  const spendReason = `lyrics_generate:${randomUUID()}`;
  await spendCredits(userId, OPERATION_COST_UNITS.generateText, spendReason);

  try {
    const result = await musicService.generateLyrics({ prompt: providerPrompt });
    await createMusicGenerationRecord({
      userId,
      type: "lyrics",
      providerTaskId: result.taskId,
      prompt: trimmedPrompt,
    });

    return {
      provider: result.provider,
      taskId: result.taskId,
      status: result.status,
      lyricsDurationSec,
    };
  } catch (error) {
    await refundCredits(
      userId,
      OPERATION_COST_UNITS.generateText,
      `lyrics_generate_failed:${spendReason}`,
    ).catch(() => undefined);
    throw error;
  }
}

export async function getLyricsGenerationStatus(
  taskId: string,
  userId: string,
  durationSec?: number,
) {
  const entitlements = await getUserEntitlements(userId);
  const lyricsDurationSec = resolveLyricsDurationSecForPlan(
    entitlements.planId,
    durationSec ?? 0,
  );

  const record = await prisma.musicGeneration.findUnique({
    where: { providerTaskId: taskId },
    select: { id: true, userId: true },
  });

  if (!record || record.userId !== userId) {
    throw new NotFoundError("Lyrics generation not found");
  }

  const status = await musicService.getLyricsGenerationStatus(taskId);
  const hasBlockedLyrics =
    status.status === "completed" &&
    (status.lyrics ?? []).some((item) => !checkContentAllowed(item.text).allowed);
  const hasProviderSensitiveWordError = status.rawStatus === "SENSITIVE_WORD_ERROR";
  const moderationBlocked = hasBlockedLyrics || hasProviderSensitiveWordError;

  const lyrics =
    moderationBlocked || status.status !== "completed"
      ? undefined
      : (status.lyrics ?? []).map((item) => ({
          ...item,
          text: truncateLyricsForDuration(item.text, lyricsDurationSec),
        }));
  const finalStatus = moderationBlocked ? "failed" : status.status;
  const finalRawStatus = moderationBlocked ? "CONTENT_MODERATION" : status.rawStatus;
  const finalErrorMessage = moderationBlocked ? CONTENT_MODERATION_ERROR_RU : status.errorMessage;

  await prisma.musicGeneration.update({
    where: { id: record.id },
    data: {
      status: finalStatus,
      rawStatus: finalRawStatus ?? null,
      errorMessage: finalErrorMessage ?? null,
      lyricsResult: lyrics ? (lyrics as unknown as Prisma.InputJsonValue) : undefined,
    },
  });

  if (finalStatus === "failed") {
    await refundCreditsOnce(
      userId,
      OPERATION_COST_UNITS.generateText,
      `lyrics_refund:${taskId}`,
    ).catch(() => undefined);
  }

  return {
    taskId: status.taskId,
    status: finalStatus,
    provider: status.provider,
    rawStatus: finalRawStatus,
    lyrics,
    errorMessage: finalErrorMessage,
    lyricsDurationSec,
  };
}

async function assertLyricsTextLengthForUser(
  userId: string,
  lyrics: string,
  durationSec: number,
): Promise<void> {
  const entitlements = await getUserEntitlements(userId);
  const maxLength = resolveManualLyricsMaxLength(entitlements.planId, durationSec);
  const effectiveDuration = resolveLyricsDurationSecForPlan(entitlements.planId, durationSec);

  if (lyrics.trim().length > maxLength) {
    throw new BadRequestError(
      `Текст слишком длинный для ~${effectiveDuration} сек — максимум ${maxLength} символов.`,
    );
  }
}

export { toMusicGenerationRecordDto };
