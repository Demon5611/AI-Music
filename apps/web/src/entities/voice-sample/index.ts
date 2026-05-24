import type { VoiceSample } from "@ai-music/shared";

export type { VoiceSample };

export function isVoiceSampleReady(sample: VoiceSample): boolean {
  return sample.consentConfirmed && sample.status === "ready";
}
