import type { GenerationStatus } from "@ai-music/shared";

export interface GenerationJobPayload {
  jobId: string;
  userId: string;
  voiceSampleId: string;
}

export const GENERATION_QUEUE_NAME = "generation";

export const GENERATION_STATUS_FLOW: GenerationStatus[] = [
  "pending",
  "preprocessing_voice",
  "generating_lyrics",
  "generating_song",
  "converting_voice",
  "uploading_result",
  "completed",
];
