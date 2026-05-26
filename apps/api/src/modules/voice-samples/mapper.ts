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
    createdAt: sample.createdAt.toISOString(),
  };
}
