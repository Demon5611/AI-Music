import type { VoiceCloneStatus, VoiceSample } from "@ai-music/shared";
import { env } from "@/shared/config/env";
import { isVoiceSampleReadyForGeneration } from "@/entities/voice-sample";

const CLONE_STATUS_LABELS: Record<VoiceCloneStatus, string> = {
  pending: "Загружен",
  preparing: "Анализ AI Music",
  awaiting_verification: "Нужна верификация",
  cloning: "Создание голоса",
  ready: "Готов",
  failed: "Ошибка",
};

export function buildVoiceSampleAudioUrl(sampleId: string): string {
  return `${env.apiUrl}/api/voice-samples/${sampleId}/audio`;
}

export function formatVoiceSampleDate(createdAt: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));
}

export function formatVoiceSampleDuration(durationSec: number): string {
  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function resolveVoiceSampleTitle(sample: VoiceSample): string {
  return `Образец от ${formatVoiceSampleDate(sample.createdAt)}`;
}

export function resolveVoiceSampleStatusLabel(sample: VoiceSample): string {
  if (isVoiceSampleReadyForGeneration(sample)) {
    return "Готов к генерации";
  }

  if (
    sample.voiceCloneStatus === "ready" &&
    sample.readyForMusicGeneration === false
  ) {
    return "Нужна верификация";
  }

  return CLONE_STATUS_LABELS[sample.voiceCloneStatus];
}

export function pickLatestReadyVoiceSampleId(samples: VoiceSample[]): string | null {
  const readySample = samples.find(isVoiceSampleReadyForGeneration);
  return readySample?.id ?? null;
}

export function pickDefaultVoiceSampleId(
  samples: VoiceSample[],
  _storedId: string | null,
): string | null {
  return pickLatestReadyVoiceSampleId(samples);
}
