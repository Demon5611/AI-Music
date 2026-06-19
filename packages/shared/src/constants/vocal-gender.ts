export type VocalGender = "m" | "f";

export const VOCAL_GENDER_LABELS: Record<VocalGender, string> = {
  m: "Муж",
  f: "Жен",
};

/** Suno `/lyrics` prompt limit (characters). */
export const SUNO_LYRICS_PROMPT_MAX_LENGTH = 200;

export function isVocalGender(value: unknown): value is VocalGender {
  return value === "m" || value === "f";
}

export function buildGenderLyricsPromptSuffix(vocalGender: VocalGender): string {
  const label = VOCAL_GENDER_LABELS[vocalGender].toLowerCase();
  const rod = vocalGender === "f" ? "женском" : "мужском";
  const examples = vocalGender === "f" ? "я пошла, я была" : "я пошёл, я был";

  return `\n\nТекст от 1-го лица (${label}): глаголы в ${rod} роде (${examples}).`;
}

export function resolveLyricsBriefMaxLength(
  vocalGender: VocalGender | null | undefined,
): number {
  if (!vocalGender) {
    return SUNO_LYRICS_PROMPT_MAX_LENGTH;
  }

  const overhead = buildGenderLyricsPromptSuffix(vocalGender).length;

  return Math.max(32, SUNO_LYRICS_PROMPT_MAX_LENGTH - overhead);
}

export function buildGenderAwareLyricsPrompt(
  prompt: string,
  vocalGender: VocalGender | null | undefined,
): string {
  const trimmedPrompt = prompt.trim();

  if (!vocalGender) {
    return trimmedPrompt;
  }

  return `${trimmedPrompt}${buildGenderLyricsPromptSuffix(vocalGender)}`;
}

export const VOICE_RECORDING_SCRIPT_GENERATION_PROMPT =
  "Короткий связный текст (~15 секунд чтения вслух) для напева голоса: про создание музыки своим голосом, вдохновляющий тон, русский язык.";

export function buildVoiceRecordingScriptPrompt(vocalGender: VocalGender): string {
  return buildGenderAwareLyricsPrompt(VOICE_RECORDING_SCRIPT_GENERATION_PROMPT, vocalGender);
}
