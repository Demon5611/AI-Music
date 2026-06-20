import type { VoiceSample } from "@ai-music/db";
import { createSunoVoiceClients } from "@ai-music/ai-providers";
import { prisma } from "@ai-music/db";

const PERSONA_VOICE_UNAVAILABLE_MESSAGE =
  "Голос AI Music недоступен для генерации. Пройдите верификацию заново на /consent.";

export interface ResolvePersonaVoiceIdOptions {
  persistCorrection?: boolean;
}

function resolveRecordVoiceId(recordInfo: {
  status: string;
  voiceId?: string | null;
}): string | null {
  if (String(recordInfo.status) !== "success") {
    return null;
  }

  const voiceId = recordInfo.voiceId?.trim();
  return voiceId || null;
}

function isTaskIdStoredAsVoiceId(sample: VoiceSample, voiceId: string): boolean {
  const taskId = sample.sunoVoiceTaskId?.trim();
  return Boolean(taskId && voiceId === taskId);
}

async function persistPersonaVoiceId(
  sampleId: string,
  personaVoiceId: string,
): Promise<void> {
  await prisma.voiceSample.update({
    where: { id: sampleId },
    data: {
      sunoVoiceId: personaVoiceId,
      voiceCloneStatus: "ready",
      voiceCloneError: null,
    },
  });
}

/**
 * Single source of truth for Suno persona voice_id used in music generate.
 *
 * - sunoVoiceTaskId → task_id (validate/generate pipeline), used only for record-info
 * - sunoVoiceId     → voice_id (personaId), never task_id
 * - ready only when check-voice accepts voice_id
 */
export async function resolvePersonaVoiceId(
  sample: VoiceSample,
  options: ResolvePersonaVoiceIdOptions = {},
): Promise<string | null> {
  const { voice } = createSunoVoiceClients();
  const taskId = sample.sunoVoiceTaskId?.trim();
  let personaVoiceId = sample.sunoVoiceId?.trim() ?? "";

  if (taskId) {
    try {
      const recordInfo = await voice.getVoiceRecordInfo(taskId);
      const recordVoiceId = resolveRecordVoiceId(recordInfo);

      if (recordVoiceId) {
        personaVoiceId = recordVoiceId;
      }
    } catch {
      // Fall back to stored sunoVoiceId below.
    }
  }

  if (!personaVoiceId || isTaskIdStoredAsVoiceId(sample, personaVoiceId)) {
    return null;
  }

  const available = await voice.checkVoiceIdAvailability(personaVoiceId);

  if (!available) {
    return null;
  }

  if (
    options.persistCorrection &&
    personaVoiceId !== sample.sunoVoiceId?.trim()
  ) {
    await persistPersonaVoiceId(sample.id, personaVoiceId);
  }

  return personaVoiceId;
}

export function isReadyForMusicGeneration(
  sample: VoiceSample,
  personaVoiceId: string | null,
): boolean {
  return (
    sample.status === "ready" &&
    sample.consentConfirmed &&
    sample.voiceCloneStatus === "ready" &&
    personaVoiceId !== null
  );
}

export { PERSONA_VOICE_UNAVAILABLE_MESSAGE };
