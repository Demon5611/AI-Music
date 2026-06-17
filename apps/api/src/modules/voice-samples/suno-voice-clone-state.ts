import type { VoiceSample } from "@ai-music/db";

export const CLONE_TIMEOUT_MS = 10 * 60 * 1000;

export function resolveVoiceCloneStartedAt(sample: VoiceSample): Date {
  return sample.voiceCloneStartedAt ?? sample.createdAt;
}

export function isVoiceCloneTimedOut(sample: VoiceSample): boolean {
  if (sample.voiceCloneStatus !== "preparing" && sample.voiceCloneStatus !== "cloning") {
    return false;
  }

  return Date.now() - resolveVoiceCloneStartedAt(sample).getTime() > CLONE_TIMEOUT_MS;
}

export function canSyncSunoVoiceTask(sample: VoiceSample): boolean {
  if (!sample.sunoVoiceTaskId) {
    return false;
  }

  return (
    sample.voiceCloneStatus === "preparing" ||
    sample.voiceCloneStatus === "cloning" ||
    sample.voiceCloneStatus === "awaiting_verification" ||
    sample.voiceCloneStatus === "failed"
  );
}

export function voiceCloneStartData() {
  return {
    voiceCloneStartedAt: new Date(),
    voiceCloneError: null,
  };
}
