import type { VoiceSample } from "@ai-music/shared";

export type { VoiceSample };

export function isVoiceSampleReady(sample: VoiceSample): boolean {
  return sample.consentConfirmed && sample.status === "ready";
}

export function isVoiceSampleReadyForGeneration(
  sample: VoiceSample,
): boolean {
  return isVoiceSampleReady(sample) && sample.kitsVoiceModelId != null;
}
