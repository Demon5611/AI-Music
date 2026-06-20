import { prisma } from "@ai-music/db";
import {
  createSunoVoiceClients,
  isSunoVoiceTaskFailed,
  isSunoVoiceTaskPending,
  MusicProviderError,
  resolveSunoVoiceConfig,
} from "@ai-music/ai-providers";
import type { VoiceSample } from "@ai-music/db";
import { MIN_VOICE_VERIFY_DURATION_SEC } from "@ai-music/shared";
import { ForbiddenError, NotFoundError } from "../../common/errors.js";
import { getStorageService } from "../storage/storage.service.js";
import { toVoiceSampleDto, toVoiceSampleDtoWithPersonaCheck } from "./mapper.js";
import {
  PERSONA_VOICE_UNAVAILABLE_MESSAGE,
  resolvePersonaVoiceId,
} from "./persona-voice-id.service.js";
import {
  canSyncSunoVoiceTask,
  isVoiceCloneTimedOut,
  resolveVoiceCloneStartedAt,
  voiceCloneStartData,
} from "./suno-voice-clone-state.js";
import { normalizeVoiceSampleMime } from "./resolve-voice-sample-mime.js";

const STUCK_PHRASE_REGEN_MS = 90_000;
const MAX_STUCK_PHRASE_REGENS = 2;

const EXPIRED_PHRASE_MESSAGE =
  "Фраза верификации истекла. Нажмите «Повторить верификацию» — AI Music выдаст новую фразу.";

function extractValidatePhrase(validateInfo: { validateInfo?: string | null }): string | null {
  const phrase = validateInfo.validateInfo?.trim();
  return phrase ? phrase : null;
}

function isExpiredVerificationPhraseMessage(message: string | null | undefined): boolean {
  const normalized = message?.trim().toLowerCase() ?? "";

  return (
    normalized.includes("phrase expired") ||
    normalized.includes("verification phrase expired") ||
    (normalized.includes("not found") && normalized.includes("phrase"))
  );
}

function mapSunoVoiceFailMessage(message: string | null | undefined): string {
  const trimmed = message?.trim();

  if (!trimmed) {
    return "AI Music Voice отклонил аудио. Запишите фразу чище и напевом.";
  }

  if (isExpiredVerificationPhraseMessage(trimmed)) {
    return EXPIRED_PHRASE_MESSAGE;
  }

  if (trimmed.toLowerCase().includes("voices sound different")) {
    return (
      "Голос не совпал с первым образцом. AI Music сравнивает две записи: " +
      "запишите образец на главной и фразу здесь одним способом — " +
      "оба раза напевом или оба раза речью, тем же голосом и в том же помещении."
    );
  }

  return trimmed;
}

async function loadOwnedSample(userId: string, sampleId: string) {
  const sample = await prisma.voiceSample.findFirst({
    where: { id: sampleId, userId },
  });

  if (!sample) {
    throw new NotFoundError("Voice sample not found");
  }

  if (!sample.consentConfirmed || sample.status !== "ready") {
    throw new ForbiddenError("Voice sample is not ready");
  }

  return sample;
}

async function readSampleBuffer(sample: VoiceSample): Promise<Buffer> {
  const buffer = await getStorageService().get(sample.r2Key);

  if (buffer.byteLength === 0) {
    throw new ForbiddenError("Voice sample file is empty");
  }

  return buffer;
}

function resolveSampleFilename(sample: VoiceSample): string {
  const extension = sample.r2Key.split(".").pop() ?? "mp3";
  return `voice-sample-${sample.id}.${extension}`;
}

function resolveSampleMimeType(filename: string): string {
  return normalizeVoiceSampleMime(filename, "");
}

function resolveRecordVoiceId(recordInfo: {
  status: string;
  voiceId?: string | null;
}): string | null {
  if (String(recordInfo.status) !== "success") {
    return null;
  }

  const voiceId = recordInfo.voiceId?.trim();
  return voiceId || null;
}

const SUNO_VOICE_UNAVAILABLE_MESSAGE = PERSONA_VOICE_UNAVAILABLE_MESSAGE;

export async function reconcileReadySunoVoiceSample(
  sample: VoiceSample,
): Promise<VoiceSample> {
  if (sample.voiceCloneStatus !== "ready" || !sample.sunoVoiceId?.trim()) {
    return sample;
  }

  const personaVoiceId = await resolvePersonaVoiceId(sample, { persistCorrection: true });

  if (personaVoiceId) {
    return prisma.voiceSample.findUniqueOrThrow({ where: { id: sample.id } });
  }

  return markCloneFailed(sample, SUNO_VOICE_UNAVAILABLE_MESSAGE);
}

export async function syncVoiceSampleListEntry(sample: VoiceSample): Promise<VoiceSample> {
  if (!sample.sunoVoiceTaskId) {
    return sample;
  }

  const shouldSync =
    canSyncSunoVoiceTask(sample) ||
    (sample.voiceCloneStatus === "ready" && !sample.sunoVoiceId?.trim());

  if (!shouldSync) {
    return sample;
  }

  return syncSunoVoiceTaskStatus(sample);
}

async function promoteValidatePhraseIfReady(
  sample: VoiceSample,
  validateInfo: { validateInfo?: string | null },
): Promise<VoiceSample | null> {
  const validatePhrase = extractValidatePhrase(validateInfo);

  if (!validatePhrase) {
    return null;
  }

  return prisma.voiceSample.update({
    where: { id: sample.id },
    data: {
      voiceCloneStatus: "awaiting_verification",
      sunoValidatePhrase: validatePhrase,
      voiceCloneError: null,
      sunoValidateRegenCount: 0,
    },
  });
}

async function markCloneFailed(sample: VoiceSample, message: string) {
  return prisma.voiceSample.update({
    where: { id: sample.id },
    data: {
      voiceCloneStatus: "failed",
      voiceCloneError: message,
      sunoValidatePhrase: null,
    },
  });
}

async function resetSunoVoiceTask(sample: VoiceSample) {
  return prisma.voiceSample.update({
    where: { id: sample.id },
    data: {
      sunoVoiceTaskId: null,
      sunoValidatePhrase: null,
      sunoVoiceId: null,
      voiceCloneStatus: "pending",
      voiceCloneError: null,
      voiceCloneStartedAt: null,
      sunoValidateRegenCount: 0,
    },
  });
}

async function maybeRegenerateStuckPhrase(
  sample: VoiceSample,
  taskId: string,
  voice: ReturnType<typeof createSunoVoiceClients>["voice"],
): Promise<VoiceSample | null> {
  if (sample.voiceCloneStatus !== "preparing") {
    return null;
  }

  if (sample.sunoValidateRegenCount >= MAX_STUCK_PHRASE_REGENS) {
    return null;
  }

  const elapsedMs = Date.now() - resolveVoiceCloneStartedAt(sample).getTime();

  if (elapsedMs < STUCK_PHRASE_REGEN_MS) {
    return null;
  }

  try {
    const config = resolveSunoVoiceConfig();
    const newTaskId = await voice.regenerateValidationPhrase(taskId, config.callbackUrl);

    return prisma.voiceSample.update({
      where: { id: sample.id },
      data: {
        sunoVoiceTaskId: newTaskId,
        sunoValidateRegenCount: sample.sunoValidateRegenCount + 1,
        sunoValidatePhrase: null,
        ...voiceCloneStartData(),
      },
    });
  } catch {
    return null;
  }
}

async function resolveWaitValidatingPhrase(
  sample: VoiceSample,
  taskId: string,
  voice: ReturnType<typeof createSunoVoiceClients>["voice"],
): Promise<VoiceSample> {
  const retryInfo = await voice.getValidationPhraseInfo(taskId);
  const promoted = await promoteValidatePhraseIfReady(sample, retryInfo);

  if (promoted) {
    return promoted;
  }

  return sample;
}

async function refreshStaleVerificationPhrase(
  sample: VoiceSample,
  taskId: string,
  validateInfo: { validateInfo?: string | null; status: string },
  voice: ReturnType<typeof createSunoVoiceClients>["voice"],
): Promise<VoiceSample | null> {
  if (sample.voiceCloneStatus !== "awaiting_verification") {
    return null;
  }

  if (String(validateInfo.status) !== "wait_validating") {
    return null;
  }

  if (extractValidatePhrase(validateInfo)) {
    return null;
  }

  if (!sample.sunoValidatePhrase?.trim()) {
    return null;
  }

  if (sample.sunoValidateRegenCount >= MAX_STUCK_PHRASE_REGENS) {
    return markCloneFailed(sample, EXPIRED_PHRASE_MESSAGE);
  }

  try {
    const config = resolveSunoVoiceConfig();
    const newTaskId = await voice.regenerateValidationPhrase(taskId, config.callbackUrl);

    return prisma.voiceSample.update({
      where: { id: sample.id },
      data: {
        sunoVoiceTaskId: newTaskId,
        sunoValidatePhrase: null,
        voiceCloneStatus: "preparing",
        sunoValidateRegenCount: sample.sunoValidateRegenCount + 1,
        ...voiceCloneStartData(),
      },
    });
  } catch {
    return markCloneFailed(sample, EXPIRED_PHRASE_MESSAGE);
  }
}

async function syncSunoVoiceTaskStatus(sample: VoiceSample) {
  if (!canSyncSunoVoiceTask(sample)) {
    return sample;
  }

  if (isVoiceCloneTimedOut(sample)) {
    return markCloneFailed(
      sample,
      sample.voiceCloneStatus === "preparing"
        ? "AI Music не выдал фразу за 5 минут. Нажмите «Повторить верификацию» или загрузите образец заново."
        : "Превышено время ожидания AI Music Voice (10 мин). Попробуйте снова.",
    );
  }

  const { voice } = createSunoVoiceClients();
  const taskId = sample.sunoVoiceTaskId!;

  const [validateInfo, recordInfo] = await Promise.all([
    voice.getValidationPhraseInfo(taskId),
    voice.getVoiceRecordInfo(taskId),
  ]);

  const staleRefresh = await refreshStaleVerificationPhrase(
    sample,
    taskId,
    validateInfo,
    voice,
  );

  if (staleRefresh) {
    return syncSunoVoiceTaskStatus(staleRefresh);
  }

  const validateStatus = String(validateInfo.status);
  const recordStatus = String(recordInfo.status);
  const errorMessage =
    recordInfo.errorMessage?.trim() ||
    validateInfo.errorMessage?.trim() ||
    null;

  if (isSunoVoiceTaskFailed(validateStatus) || isSunoVoiceTaskFailed(recordStatus)) {
    return markCloneFailed(sample, mapSunoVoiceFailMessage(errorMessage));
  }

  const voiceId = resolveRecordVoiceId(recordInfo);

  if (recordStatus === "success" && voiceId) {
    const available = await voice.checkVoiceIdAvailability(voiceId);

    if (!available) {
      return markCloneFailed(sample, SUNO_VOICE_UNAVAILABLE_MESSAGE);
    }

    return prisma.voiceSample.update({
      where: { id: sample.id },
      data: {
        voiceCloneStatus: "ready",
        sunoVoiceId: voiceId,
        voiceCloneError: null,
      },
    });
  }

  if (
    sample.voiceCloneStatus === "awaiting_verification" &&
    validateStatus === "success" &&
    (isSunoVoiceTaskPending(recordStatus) || recordStatus === "success")
  ) {
    return prisma.voiceSample.update({
      where: { id: sample.id },
      data: {
        voiceCloneStatus: "cloning",
        ...voiceCloneStartData(),
      },
    });
  }

  const validatePhrase = extractValidatePhrase(validateInfo);

  if (validateStatus === "wait_validating" && sample.voiceCloneStatus !== "cloning") {
    if (validatePhrase) {
      const promoted = await promoteValidatePhraseIfReady(sample, validateInfo);

      if (promoted) {
        return promoted;
      }
    }

    const regenerated = await maybeRegenerateStuckPhrase(sample, taskId, voice);

    if (regenerated) {
      return syncSunoVoiceTaskStatus(regenerated);
    }

    return resolveWaitValidatingPhrase(sample, taskId, voice);
  }

  if (sample.voiceCloneStatus === "cloning") {
    if (isSunoVoiceTaskPending(recordStatus) || recordStatus === "success") {
      return sample;
    }

    return sample;
  }

  if (
    isSunoVoiceTaskPending(validateStatus) ||
    isSunoVoiceTaskPending(recordStatus) ||
    recordStatus === "success"
  ) {
    return sample;
  }

  return sample;
}

function mapSunoVoicePrepareError(error: unknown): string {
  const message = error instanceof Error ? error.message.trim() : String(error);

  if (message.toLowerCase().includes("internal error")) {
    return "Сервис AI Music временно недоступен. Подождите 1–2 минуты и нажмите «Повторить верификацию».";
  }

  if (message.toLowerCase().includes("abort")) {
    return "Загрузка в AI Music прервана по таймауту. Проверьте интернет и попробуйте снова.";
  }

  return message || "Не удалось отправить образец в AI Music Voice";
}

async function markPrepareFailed(sampleId: string, error: unknown): Promise<never> {
  const voiceCloneError = mapSunoVoicePrepareError(error);

  await prisma.voiceSample.update({
    where: { id: sampleId },
    data: {
      voiceCloneStatus: "failed",
      voiceCloneError,
    },
  });

  throw new ForbiddenError(voiceCloneError);
}

function mapSunoVoiceSubmitError(error: unknown): never {
  if (error instanceof MusicProviderError) {
    if (isExpiredVerificationPhraseMessage(error.message)) {
      throw new ForbiddenError(EXPIRED_PHRASE_MESSAGE);
    }

    if (error.message.toLowerCase().includes("not in valid status")) {
      throw new ForbiddenError(
        "Сессия верификации AI Music истекла или уже использована. Нажмите «Повторить» и запишите фразу снова.",
      );
    }

    if (error.message.toLowerCase().includes("internal error")) {
      throw new ForbiddenError(
        "Сервис AI Music временно недоступен. Подождите 1–2 минуты и попробуйте снова.",
      );
    }

    throw new ForbiddenError(error.message);
  }

  if (error instanceof Error && error.message.toLowerCase().includes("internal error")) {
    throw new ForbiddenError(
      "Сервис AI Music временно недоступен. Подождите 1–2 минуты и попробуйте снова.",
    );
  }

  throw error;
}

async function assertValidateTaskReady(
  taskId: string,
  cachedPhrase?: string | null,
): Promise<void> {
  const { voice } = createSunoVoiceClients();
  let validateInfo = await voice.getValidationPhraseInfo(taskId);
  let status = String(validateInfo.status);

  if (
    status === "wait_validating" &&
    !extractValidatePhrase(validateInfo) &&
    !cachedPhrase?.trim()
  ) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    validateInfo = await voice.getValidationPhraseInfo(taskId);
    status = String(validateInfo.status);
  }

  if (status === "wait_validating") {
    const livePhrase = extractValidatePhrase(validateInfo);

    if (livePhrase) {
      return;
    }

    if (cachedPhrase?.trim()) {
      throw new ForbiddenError(EXPIRED_PHRASE_MESSAGE);
    }

    throw new ForbiddenError(
      "Фраза для верификации ещё загружается. Подождите 10–20 секунд и обновите страницу.",
    );
  }

  if (status === "success") {
    throw new ForbiddenError(
      "Верификация уже отправлена. Обновите страницу и дождитесь создания голоса.",
    );
  }

  if (isSunoVoiceTaskFailed(status)) {
    throw new ForbiddenError(
      `${mapSunoVoiceFailMessage(validateInfo.errorMessage)} Нажмите «Повторить» и запишите фразу снова.`,
    );
  }

  throw new ForbiddenError(
    "AI Music ещё не готов принять запись верификации. Подождите несколько секунд и попробуйте снова.",
  );
}

export async function getSunoVoiceCloneStatus(userId: string, sampleId: string) {
  let sample = await loadOwnedSample(userId, sampleId);
  sample = await syncSunoVoiceTaskStatus(sample);
  return toVoiceSampleDtoWithPersonaCheck(sample, resolvePersonaVoiceId);
}

const VOICE_CLONE_CANCELLED_MESSAGE =
  "Процесс остановлен. Нажмите «Повторить верификацию», чтобы начать заново.";

export async function cancelSunoVoiceClone(userId: string, sampleId: string) {
  const sample = await loadOwnedSample(userId, sampleId);

  if (sample.voiceCloneStatus === "ready" && sample.sunoVoiceId) {
    return toVoiceSampleDto(sample);
  }

  const cancelled = await markCloneFailed(sample, VOICE_CLONE_CANCELLED_MESSAGE);
  return toVoiceSampleDto(cancelled);
}

export interface PrepareSunoVoiceCloneOptions {
  restart?: boolean;
}

export async function prepareSunoVoiceClone(
  userId: string,
  sampleId: string,
  options: PrepareSunoVoiceCloneOptions = {},
) {
  let sample = await loadOwnedSample(userId, sampleId);

  if (options.restart) {
    if (sample.sunoVoiceTaskId) {
      sample = await syncSunoVoiceTaskStatus(sample);
    }

    const personaVoiceId = await resolvePersonaVoiceId(sample);

    if (sample.voiceCloneStatus === "ready" && personaVoiceId) {
      return toVoiceSampleDtoWithPersonaCheck(sample, resolvePersonaVoiceId);
    }

    sample = await resetSunoVoiceTask(sample);
  }

  if (sample.voiceCloneStatus === "failed" && sample.sunoVoiceTaskId) {
    sample = await syncSunoVoiceTaskStatus(sample);

    if (sample.voiceCloneStatus !== "failed") {
      return toVoiceSampleDto(sample);
    }
  }

  if (sample.voiceCloneStatus === "ready" && sample.sunoVoiceId) {
    const personaVoiceId = await resolvePersonaVoiceId(sample, { persistCorrection: true });

    if (personaVoiceId) {
      return toVoiceSampleDtoWithPersonaCheck(sample, resolvePersonaVoiceId);
    }

    sample = await resetSunoVoiceTask(sample);
  }

  if (
    sample.voiceCloneStatus === "awaiting_verification" &&
    sample.sunoValidatePhrase &&
    sample.sunoVoiceTaskId
  ) {
    sample = await syncSunoVoiceTaskStatus(sample);
    return toVoiceSampleDto(sample);
  }

  if (
    (sample.voiceCloneStatus === "preparing" ||
      sample.voiceCloneStatus === "cloning") &&
    sample.sunoVoiceTaskId
  ) {
    sample = await syncSunoVoiceTaskStatus(sample);
    return toVoiceSampleDto(sample);
  }

  const config = resolveSunoVoiceConfig();

  if (!config.apiKey.trim()) {
    throw new ForbiddenError("SUNO_API_KEY не настроен");
  }

  const buffer = await readSampleBuffer(sample);
  const filename = resolveSampleFilename(sample);
  const mimeType = resolveSampleMimeType(filename);
  const { voice, fileUpload } = createSunoVoiceClients(config);

  try {
    const uploaded = await fileUpload.uploadAudio(buffer, filename, mimeType);
    const vocalEndS = Math.max(1, Math.min(sample.durationSec, 120));
    const taskId = await voice.createValidationPhrase({
      voiceUrl: uploaded.downloadUrl,
      vocalStartS: 0,
      vocalEndS,
      language: config.voiceLanguage,
      callBackUrl: config.callbackUrl,
    });

    const updated = await prisma.voiceSample.update({
      where: { id: sample.id },
      data: {
        sunoVoiceTaskId: taskId,
        voiceCloneStatus: "preparing",
        sunoValidatePhrase: null,
        sunoVoiceId: null,
        sunoValidateRegenCount: 0,
        ...voiceCloneStartData(),
      },
    });

    const synced = await syncSunoVoiceTaskStatus(updated);
    return toVoiceSampleDto(synced);
  } catch (error) {
    return markPrepareFailed(sample.id, error);
  }
}

export interface SubmitSunoVoiceVerificationInput {
  userId: string;
  sampleId: string;
  filename: string;
  mimeType: string;
  fileBuffer: Buffer;
  durationSec?: number;
}

export async function submitSunoVoiceVerification(
  input: SubmitSunoVoiceVerificationInput,
) {
  let sample = await loadOwnedSample(input.userId, input.sampleId);

  if (sample.voiceCloneStatus === "ready" && sample.sunoVoiceId) {
    return toVoiceSampleDto(sample);
  }

  if (sample.sunoVoiceTaskId) {
    sample = await syncSunoVoiceTaskStatus(sample);

    if (sample.voiceCloneStatus === "ready" && sample.sunoVoiceId) {
      return toVoiceSampleDto(sample);
    }

    if (sample.voiceCloneStatus === "cloning") {
      throw new ForbiddenError(
        "Голос уже создаётся. Не закрывайте страницу — обычно это занимает около минуты.",
      );
    }

    if (sample.voiceCloneStatus === "failed") {
      throw new ForbiddenError(
        sample.voiceCloneError ??
          "AI Music Voice отклонил аудио. Запишите фразу чище и напевом.",
      );
    }

    if (sample.voiceCloneStatus === "preparing") {
      throw new ForbiddenError(
        "Фраза устарела — AI Music готовит новую. Подождите 10–20 секунд, пока появится текст для записи.",
      );
    }
  }

  if (sample.voiceCloneStatus !== "awaiting_verification") {
    throw new ForbiddenError("Сначала дождитесь фразы для верификации");
  }

  if (!sample.sunoVoiceTaskId || !sample.sunoValidatePhrase?.trim()) {
    throw new ForbiddenError("Задача верификации голоса AI Music не инициализирована");
  }

  const mimeType = normalizeVoiceSampleMime(input.filename, input.mimeType);

  if (
    input.durationSec !== undefined &&
    input.durationSec < MIN_VOICE_VERIFY_DURATION_SEC
  ) {
    throw new ForbiddenError(
      `Запись слишком короткая — минимум ${MIN_VOICE_VERIFY_DURATION_SEC} сек. Произнесите фразу целиком.`,
    );
  }

  await assertValidateTaskReady(sample.sunoVoiceTaskId, sample.sunoValidatePhrase);

  const config = resolveSunoVoiceConfig();
  const { voice, fileUpload } = createSunoVoiceClients(config);
  const uploaded = await fileUpload.uploadAudio(
    input.fileBuffer,
    input.filename,
    mimeType,
  );

  let generateTaskId: string;

  try {
    generateTaskId = await voice.generateCustomVoice({
      taskId: sample.sunoVoiceTaskId,
      verifyUrl: uploaded.downloadUrl,
      voiceName: `voice-${sample.id}`,
      description: "AI Music user voice",
      singerSkillLevel: "beginner",
      callBackUrl: config.callbackUrl,
    });
  } catch (error) {
    const rawMessage =
      error instanceof MusicProviderError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);

    if (isExpiredVerificationPhraseMessage(rawMessage)) {
      await markCloneFailed(sample, EXPIRED_PHRASE_MESSAGE);
      throw new ForbiddenError(EXPIRED_PHRASE_MESSAGE);
    }

    mapSunoVoiceSubmitError(error);
  }

  const updated = await prisma.voiceSample.update({
    where: { id: sample.id },
    data: {
      sunoVoiceTaskId: generateTaskId,
      voiceCloneStatus: "cloning",
      ...voiceCloneStartData(),
    },
  });

  const synced = await syncSunoVoiceTaskStatus(updated);
  return toVoiceSampleDtoWithPersonaCheck(synced, resolvePersonaVoiceId);
}
