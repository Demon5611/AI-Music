import type { GenerateSongInput } from "@ai-music/ai-providers";
import { createSunoVoiceClients } from "@ai-music/ai-providers";
import { stripPersonaConflictingStyleTags } from "@ai-music/shared";
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

  if (await voice.checkVoiceIdAvailability(persona.personaId)) {
    return;
  }

  log?.warn(
    {
      personaId: persona.personaId,
      sunoVoiceTaskId: persona.sunoVoiceTaskId,
    },
    "Suno voice_id check returned unavailable; blocking music generation",
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
        "Голос AI Music не прошёл проверку Suno. Откройте /consent и пройдите верификацию заново — перезагрузка образца не нужна, если запись на главной сохранена.",
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
    prompt: rest.prompt.trim(),
    style: stripPersonaConflictingStyleTags(rest.style),
    personaId: persona.personaId,
    personaModel: persona.personaModel,
  };
}
