import type { VoiceSample } from "@ai-music/db";
import { createSunoVoiceClients } from "@ai-music/ai-providers";
import { prisma } from "@ai-music/db";
import { reconcileReadySunoVoiceSample } from "./suno-voice.service.js";

async function resolvePreferredPersonaId(sample: VoiceSample): Promise<string | null> {
  const voiceId = sample.sunoVoiceId?.trim();
  const taskId = sample.sunoVoiceTaskId?.trim();
  const { voice } = createSunoVoiceClients();

  if (voiceId && (await voice.checkVoiceAvailability(voiceId))) {
    return voiceId;
  }

  if (taskId && (await voice.checkVoiceAvailability(taskId))) {
    return taskId;
  }

  return null;
}

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
  const personaId = await resolvePreferredPersonaId(sample);

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
