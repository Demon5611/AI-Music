import type { VoiceSample } from "@ai-music/shared";

export type { VoiceSample };

export function isVoiceSampleReady(sample: VoiceSample): boolean {
  return sample.consentConfirmed && sample.status === "ready";
}

export function isVoiceSampleReadyForGeneration(
  sample: VoiceSample,
): boolean {
  if (sample.readyForMusicGeneration !== undefined) {
    return sample.readyForMusicGeneration;
  }

  return isVoiceSampleReady(sample) && sample.voiceCloneStatus === "ready";
}

/** Suno clone marked ready, but live check-voice(voice_id) failed — need /consent restart. */
export function needsPersonaReverification(sample: VoiceSample): boolean {
  return sample.voiceCloneStatus === "ready" && sample.readyForMusicGeneration === false;
}
