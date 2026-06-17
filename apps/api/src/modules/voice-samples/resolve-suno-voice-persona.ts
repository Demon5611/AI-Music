import { prisma } from "@ai-music/db";

export async function findReadySunoVoiceSample(userId: string) {
  return prisma.voiceSample.findFirst({
    where: {
      userId,
      status: "ready",
      consentConfirmed: true,
      voiceCloneStatus: "ready",
      sunoVoiceId: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function resolveSunoVoicePersonaForUser(userId: string) {
  const sample = await findReadySunoVoiceSample(userId);
  const personaId = sample?.sunoVoiceId?.trim();

  if (!personaId) {
    return null;
  }

  return {
    voiceSampleId: sample.id,
    personaId,
    personaModel: "voice_persona" as const,
  };
}
