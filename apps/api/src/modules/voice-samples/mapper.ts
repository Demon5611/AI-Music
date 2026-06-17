import type { VoiceSample as VoiceSampleDto } from "@ai-music/shared";
import type { VoiceSample } from "@ai-music/db";

export function toVoiceSampleDto(sample: VoiceSample): VoiceSampleDto {
  return {
    id: sample.id,
    userId: sample.userId,
    r2Key: sample.r2Key,
    durationSec: sample.durationSec,
    status: sample.status as VoiceSampleDto["status"],
    consentConfirmed: sample.consentConfirmed,
    kitsVoiceModelId: sample.kitsVoiceModelId,
    sunoVoiceId: sample.sunoVoiceId,
    sunoVoiceTaskId: sample.sunoVoiceTaskId,
    sunoValidatePhrase: sample.sunoValidatePhrase,
    voiceCloneStatus: sample.voiceCloneStatus as VoiceSampleDto["voiceCloneStatus"],
    voiceCloneError: sample.voiceCloneError,
    createdAt: sample.createdAt.toISOString(),
  };
}
