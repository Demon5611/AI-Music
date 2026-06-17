import { prisma } from "@ai-music/db";
import {
  createSunoVoiceClients,
  isSunoVoiceTaskFailed,
  isSunoVoiceTaskPending,
  resolveSunoVoiceConfig,
} from "@ai-music/ai-providers";
import type { VoiceSample } from "@ai-music/db";
import { ForbiddenError, NotFoundError } from "../../common/errors.js";
import { getStorageService } from "../storage/storage.service.js";
import { toVoiceSampleDto } from "./mapper.js";

const ALLOWED_VERIFY_MIME = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/flac",
]);

const CLONE_TIMEOUT_MS = 10 * 60 * 1000;

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
  const extension = filename.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "wav":
      return "audio/wav";
    case "webm":
      return "audio/webm";
    case "flac":
      return "audio/flac";
    default:
      return "audio/mpeg";
  }
}

function isCloneTimedOut(sample: VoiceSample): boolean {
  if (sample.voiceCloneStatus !== "preparing" && sample.voiceCloneStatus !== "cloning") {
    return false;
  }

  return Date.now() - sample.createdAt.getTime() > CLONE_TIMEOUT_MS;
}

async function markCloneFailed(sample: VoiceSample, message: string) {
  return prisma.voiceSample.update({
    where: { id: sample.id },
    data: {
      voiceCloneStatus: "failed",
      voiceCloneError: message,
    },
  });
}

async function syncSunoVoiceTaskStatus(sample: VoiceSample) {
  if (!sample.sunoVoiceTaskId) {
    return sample;
  }

  if (
    sample.voiceCloneStatus !== "preparing" &&
    sample.voiceCloneStatus !== "cloning" &&
    sample.voiceCloneStatus !== "awaiting_verification"
  ) {
    return sample;
  }

  if (isCloneTimedOut(sample)) {
    return markCloneFailed(
      sample,
      "Превышено время ожидания Suno Voice (10 мин). Попробуйте снова.",
    );
  }

  const { voice } = createSunoVoiceClients();
  const [validateInfo, recordInfo] = await Promise.all([
    voice.getValidationPhraseInfo(sample.sunoVoiceTaskId),
    voice.getVoiceRecordInfo(sample.sunoVoiceTaskId),
  ]);

  const validateStatus = String(validateInfo.status);
  const recordStatus = String(recordInfo.status);
  const errorMessage =
    recordInfo.errorMessage?.trim() ||
    validateInfo.errorMessage?.trim() ||
    null;

  if (isSunoVoiceTaskFailed(validateStatus) || isSunoVoiceTaskFailed(recordStatus)) {
    return markCloneFailed(
      sample,
      errorMessage ?? "Suno Voice отклонил аудио. Запишите фразу чище и напевом.",
    );
  }

  const voiceId = recordInfo.voiceId?.trim();

  if (recordStatus === "success" && voiceId) {
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
    sample.voiceCloneStatus === "preparing" &&
    validateStatus === "wait_validating" &&
    validateInfo.validateInfo?.trim()
  ) {
    return prisma.voiceSample.update({
      where: { id: sample.id },
      data: {
        voiceCloneStatus: "awaiting_verification",
        sunoValidatePhrase: validateInfo.validateInfo.trim(),
        voiceCloneError: null,
      },
    });
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

export async function getSunoVoiceCloneStatus(userId: string, sampleId: string) {
  let sample = await loadOwnedSample(userId, sampleId);
  sample = await syncSunoVoiceTaskStatus(sample);
  return toVoiceSampleDto(sample);
}

export async function prepareSunoVoiceClone(userId: string, sampleId: string) {
  let sample = await loadOwnedSample(userId, sampleId);

  if (sample.voiceCloneStatus === "ready" && sample.sunoVoiceId) {
    return toVoiceSampleDto(sample);
  }

  if (
    sample.voiceCloneStatus === "awaiting_verification" &&
    sample.sunoValidatePhrase
  ) {
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
      voiceCloneError: null,
      sunoValidatePhrase: null,
      sunoVoiceId: null,
    },
  });

  const synced = await syncSunoVoiceTaskStatus(updated);
  return toVoiceSampleDto(synced);
}

export interface SubmitSunoVoiceVerificationInput {
  userId: string;
  sampleId: string;
  filename: string;
  mimeType: string;
  fileBuffer: Buffer;
}

export async function submitSunoVoiceVerification(
  input: SubmitSunoVoiceVerificationInput,
) {
  const sample = await loadOwnedSample(input.userId, input.sampleId);

  if (sample.voiceCloneStatus === "ready" && sample.sunoVoiceId) {
    return toVoiceSampleDto(sample);
  }

  if (sample.voiceCloneStatus !== "awaiting_verification") {
    throw new ForbiddenError("Сначала дождитесь фразы для верификации");
  }

  if (!sample.sunoVoiceTaskId || !sample.sunoValidatePhrase?.trim()) {
    throw new ForbiddenError("Suno Voice task is not initialized");
  }

  if (!ALLOWED_VERIFY_MIME.has(input.mimeType)) {
    throw new ForbiddenError("Unsupported audio format");
  }

  const config = resolveSunoVoiceConfig();
  const { voice, fileUpload } = createSunoVoiceClients(config);
  const uploaded = await fileUpload.uploadAudio(
    input.fileBuffer,
    input.filename,
    input.mimeType,
  );

  const generateTaskId = await voice.generateCustomVoice({
    taskId: sample.sunoVoiceTaskId,
    verifyUrl: uploaded.downloadUrl,
    voiceName: `voice-${sample.id}`,
    description: "AI Music user voice",
    singerSkillLevel: "beginner",
    callBackUrl: config.callbackUrl,
  });

  const updated = await prisma.voiceSample.update({
    where: { id: sample.id },
    data: {
      sunoVoiceTaskId: generateTaskId,
      voiceCloneStatus: "cloning",
      voiceCloneError: null,
    },
  });

  const synced = await syncSunoVoiceTaskStatus(updated);
  return toVoiceSampleDto(synced);
}
