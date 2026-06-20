import type { VoiceSample } from "@ai-music/db";
import { createSunoVoiceClients } from "@ai-music/ai-providers";
import { prisma } from "@ai-music/db";
import { reconcileReadySunoVoiceSample } from "./suno-voice.service.js";

async function refreshVoiceIdFromSunoRecord(sample: VoiceSample): Promise<string | null> {
  const { voice } = createSunoVoiceClients();
  const taskId = sample.sunoVoiceTaskId?.trim();
  let voiceId = sample.sunoVoiceId?.trim() ?? "";

  if (taskId) {
    try {
      const recordInfo = await voice.getVoiceRecordInfo(taskId);
      const freshVoiceId = recordInfo.voiceId?.trim();

      if (String(recordInfo.status) === "success" && freshVoiceId) {
        voiceId = freshVoiceId;

        if (freshVoiceId !== sample.sunoVoiceId?.trim()) {
          await prisma.voiceSample.update({
            where: { id: sample.id },
            data: {
              sunoVoiceId: freshVoiceId,
              voiceCloneStatus: "ready",
              voiceCloneError: null,
            },
          });
        }
      }
    } catch {
      // Fall back to stored voiceId below.
    }
  }

  if (!voiceId) {
    return null;
  }

  const available = await voice.checkVoiceIdAvailability(voiceId);

  return available ? voiceId : null;
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
  const personaId = await refreshVoiceIdFromSunoRecord(sample);

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
