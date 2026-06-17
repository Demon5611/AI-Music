import type { GenerateSongInput } from "@ai-music/ai-providers";
import { createSunoVoiceClients } from "@ai-music/ai-providers";
import { ForbiddenError } from "../../common/errors.js";
import { resolveSunoVoicePersonaForUser } from "../voice-samples/resolve-suno-voice-persona.js";

export interface MusicGenerateLogger {
  info: (payload: Record<string, unknown>, message: string) => void;
}

async function assertSunoPersonaAvailable(personaId: string): Promise<void> {
  const { voice } = createSunoVoiceClients();
  const available = await voice.checkVoiceAvailability(personaId);

  if (!available) {
    throw new ForbiddenError(
      "Голос Suno недоступен. Пройдите верификацию заново на /consent.",
    );
  }
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

  await assertSunoPersonaAvailable(persona.personaId);

  log?.info(
    {
      userId,
      voiceSampleId: persona.voiceSampleId,
      personaId: persona.personaId,
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
  return {
    ...input,
    personaId: persona.personaId,
    personaModel: persona.personaModel,
  };
}
