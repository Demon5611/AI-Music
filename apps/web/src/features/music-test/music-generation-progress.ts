import type { MusicGenerationRecordStatus } from "@ai-music/shared";
import type { AgentState } from "@/shared/ui/elevenlabs/agent-state";

export const MUSIC_RAW_STATUS_LABELS: Record<string, string> = {
  PENDING: "В очереди у AI",
  GENERATING: "Генерация музыки",
  TEXT_SUCCESS: "Текст готов",
  FIRST_SUCCESS: "Первый трек готов",
  SUCCESS: "Готово",
};

const MUSIC_RAW_STATUS_PROGRESS: Record<string, number> = {
  PENDING: 12,
  GENERATING: 38,
  TEXT_SUCCESS: 58,
  FIRST_SUCCESS: 82,
  SUCCESS: 100,
};

const MUSIC_RAW_STATUS_AGENT: Record<string, AgentState> = {
  PENDING: "thinking",
  GENERATING: "thinking",
  TEXT_SUCCESS: "talking",
  FIRST_SUCCESS: "listening",
};

export function resolveMusicGenerationLabel(
  rawStatus?: string | null,
  status?: MusicGenerationRecordStatus,
  isStarting?: boolean,
): string {
  if (isStarting) {
    return "Запуск генерации...";
  }

  if (rawStatus && MUSIC_RAW_STATUS_LABELS[rawStatus]) {
    return MUSIC_RAW_STATUS_LABELS[rawStatus];
  }

  if (status === "pending") {
    return "В очереди у AI";
  }

  if (status === "processing") {
    return "Генерация музыки";
  }

  return "Генерация...";
}

export function resolveMusicGenerationProgress(
  rawStatus?: string | null,
  status?: MusicGenerationRecordStatus,
  isStarting?: boolean,
): number {
  if (isStarting) {
    return 5;
  }

  if (rawStatus && rawStatus in MUSIC_RAW_STATUS_PROGRESS) {
    return MUSIC_RAW_STATUS_PROGRESS[rawStatus];
  }

  if (status === "pending") {
    return 12;
  }

  if (status === "processing") {
    return 40;
  }

  return 15;
}

export function resolveMusicGenerationAgentState(rawStatus?: string | null): AgentState {
  if (rawStatus && rawStatus in MUSIC_RAW_STATUS_AGENT) {
    return MUSIC_RAW_STATUS_AGENT[rawStatus];
  }

  return "thinking";
}

export function formatElapsedDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
