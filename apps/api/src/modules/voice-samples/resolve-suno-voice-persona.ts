import { prisma } from "@ai-music/db";

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
  const sample = await findReadySunoVoiceSample(userId, voiceSampleId);
  const personaId = sample?.sunoVoiceId?.trim();

  if (!sample || !personaId) {
    return null;
  }

  return {
    voiceSampleId: sample.id,
    personaId,
    personaModel: "voice_persona" as const,
  };
}
