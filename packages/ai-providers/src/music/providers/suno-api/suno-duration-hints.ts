import type { GenerateSongInput } from "../../domain/music.types.js";

const MAX_STYLE_LENGTH = 1000;
const MAX_PROMPT_LENGTH = 500;

export function applySunoDurationHints(
  input: GenerateSongInput,
  customMode: boolean,
): { prompt: string; style?: string } {
  const durationSec = input.durationSec;

  if (!durationSec || durationSec <= 0) {
    return {
      prompt: input.prompt,
      style: input.style,
    };
  }

  const durationHint = `very short ${durationSec}s track, max ${durationSec} seconds`;

  if (customMode) {
    const styleParts = [input.style?.trim(), durationHint].filter(Boolean);
    const style = styleParts.join(", ").slice(0, MAX_STYLE_LENGTH);

    return {
      prompt: input.prompt,
      style,
    };
  }

  const promptSuffix = ` Keep under ${durationSec} seconds, short jingle.`;
  const prompt = `${input.prompt.trim()}${promptSuffix}`.slice(
    0,
    MAX_PROMPT_LENGTH,
  );

  return {
    prompt,
    style: input.style,
  };
}
