import type { GenerateSongInput } from "@ai-music/ai-providers";
import { createSunoVoiceClients } from "@ai-music/ai-providers";
import { ForbiddenError } from "../../common/errors.js";
import { resolveSunoVoicePersonaForUser } from "../voice-samples/resolve-suno-voice-persona.js";

const SUNO_VOICE_UNAVAILABLE_MESSAGE =
  "Голос AI Music недоступен для генерации. Пройдите верификацию заново на /consent.";

export interface MusicGenerateLogger {
  info: (payload: Record<string, unknown>, message: string) => void;
  warn: (payload: Record<string, unknown>, message: string) => void;
}

async function assertSunoPersonaAvailable(
  persona: NonNullable<Awaited<ReturnType<typeof resolveSunoVoicePersonaForUser>>>,
  log?: MusicGenerateLogger,
): Promise<void> {
  const { voice } = createSunoVoiceClients();
  const candidateIds = [persona.sunoVoiceTaskId, persona.personaId].filter(
    (id): id is string => Boolean(id?.trim()),
  );

  for (const id of candidateIds) {
    if (await voice.checkVoiceAvailability(id)) {
      return;
    }
  }

  log?.warn(
    {
      personaId: persona.personaId,
      sunoVoiceTaskId: persona.sunoVoiceTaskId,
      candidateIds,
    },
    "Suno check-voice returned unavailable; blocking music generation",
  );

  throw new ForbiddenError(SUNO_VOICE_UNAVAILABLE_MESSAGE);
}

export async function resolveMusicPersonaForUser(
  userId: string,
  voiceSampleId?: string,
  log?: MusicGenerateLogger,
) {
  const persona = await resolveSunoVoicePersonaForUser(userId, voiceSampleId);

  if (!persona) {
    if (voiceSampleId) {
      throw new ForbiddenError(
        "Выбранный образец голоса не готов. Пройдите верификацию на /consent или выберите другой.",
      );
    }

    return null;
  }

  await assertSunoPersonaAvailable(persona, log);

  log?.info(
    {
      userId,
      voiceSampleId: persona.voiceSampleId,
      personaId: persona.personaId,
      sunoVoiceTaskId: persona.sunoVoiceTaskId,
      personaModel: persona.personaModel,
    },
    "Resolved Suno Voice persona for music generation",
  );

  return persona;
}

export function buildPersonaSongInput(
  input: GenerateSongInput,
  persona: NonNullable<Awaited<ReturnType<typeof resolveSunoVoicePersonaForUser>>>,
): GenerateSongInput {
  const { vocalGender: _ignored, ...rest } = input;

  return {
    ...rest,
    personaId: persona.personaId,
    personaModel: persona.personaModel,
  };
}
