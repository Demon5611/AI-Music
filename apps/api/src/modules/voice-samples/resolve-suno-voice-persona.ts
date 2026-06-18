import { prisma } from "@ai-music/db";
import { reconcileReadySunoVoiceSample } from "./suno-voice.service.js";

export async function findReadySunoVoiceSample(userId: string, voiceSampleId?: string) {
  return prisma.voiceSample.findFirst({
    where: {
      userId,
      status: "ready",
      consentConfirmed: true,
      voiceCloneStatus: "ready",
      sunoVoiceId: { not: null },
      ...(voiceSampleId ? { id: voiceSampleId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function resolveSunoVoicePersonaForUser(
  userId: string,
  voiceSampleId?: string,
) {
  const found = await findReadySunoVoiceSample(userId, voiceSampleId);

  if (!found) {
    return null;
  }

  const sample = await reconcileReadySunoVoiceSample(found);
  const personaId = sample.sunoVoiceId?.trim();

  if (sample.voiceCloneStatus !== "ready" || !personaId) {
    return null;
  }

  return {
    voiceSampleId: sample.id,
    personaId,
    sunoVoiceTaskId: sample.sunoVoiceTaskId,
    personaModel: "voice_persona" as const,
  };
}
