import type { GenerationJob } from "@ai-music/shared";

export const GENERATION_STATUS_LABELS: Record<GenerationJob["status"], string> = {
  pending: "В очереди",
  preprocessing_voice: "Подготовка голоса",
  generating_lyrics: "Генерация текста",
  generating_song: "Генерация музыки",
  converting_voice: "Обработка голоса",
  uploading_result: "Сохранение результата",
  completed: "Готово",
  failed: "Ошибка",
};

const GENERATION_STATUS_PROGRESS: Record<GenerationJob["status"], number> = {
  pending: 8,
  preprocessing_voice: 20,
  generating_lyrics: 35,
  generating_song: 55,
  converting_voice: 75,
  uploading_result: 90,
  completed: 100,
  failed: 0,
};

export function resolveGenerationProgress(status: GenerationJob["status"]): number {
  return GENERATION_STATUS_PROGRESS[status];
}

export function isGenerationInProgress(status: GenerationJob["status"]): boolean {
  return status !== "completed" && status !== "failed";
}
