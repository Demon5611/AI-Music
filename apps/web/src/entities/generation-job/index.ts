import type { GenerationJob, GenerationStatus } from "@ai-music/shared";

export type { GenerationJob, GenerationStatus };

export function isGenerationComplete(status: GenerationStatus): boolean {
  return status === "completed";
}

export function isGenerationFailed(status: GenerationStatus): boolean {
  return status === "failed";
}
