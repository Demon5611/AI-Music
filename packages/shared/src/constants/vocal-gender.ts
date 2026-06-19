export type VocalGender = "m" | "f";

export const VOCAL_GENDER_LABELS: Record<VocalGender, string> = {
  m: "Муж",
  f: "Жен",
};

export function isVocalGender(value: unknown): value is VocalGender {
  return value === "m" || value === "f";
}

export function buildGenderAwareLyricsPrompt(
  prompt: string,
  vocalGender: VocalGender | null | undefined,
): string {
  const trimmedPrompt = prompt.trim();

  if (!vocalGender) {
    return trimmedPrompt;
  }

  const genderForms =
    vocalGender === "f"
      ? "я пошла, я сделала, я была, я хотела"
      : "я пошёл, я сделал, я был, я хотел";

  return [
    trimmedPrompt,
    "",
    `Важно: текст от первого лица автора (${VOCAL_GENDER_LABELS[vocalGender].toLowerCase()}й род).`,
    `Глаголы прошедшего времени — только в форме ${vocalGender === "f" ? "женского" : "мужского"} рода`,
    `(например: ${genderForms}). Не используй формы противоположного рода.`,
  ].join("\n");
}

export const VOICE_RECORDING_SCRIPT_GENERATION_PROMPT =
  "Короткий связный текст (~15 секунд чтения вслух) для напева голоса: про создание музыки своим голосом, вдохновляющий тон, русский язык.";

export function buildVoiceRecordingScriptPrompt(vocalGender: VocalGender): string {
  return buildGenderAwareLyricsPrompt(VOICE_RECORDING_SCRIPT_GENERATION_PROMPT, vocalGender);
}
