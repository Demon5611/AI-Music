import { FREE_TIER_DEFAULT_DURATION_SEC } from "./music-combo-styles.js";
import type { PlanId } from "./plans.js";
import { PLANS } from "./plans.js";
import {
  buildGenderLyricsPromptSuffix,
  SUNO_LYRICS_PROMPT_MAX_LENGTH,
  type VocalGender,
} from "./vocal-gender.js";

/** Matches Suno custom-mode lyrics truncation in ai-providers. */
export const SUNO_LYRICS_CHARS_PER_SEC = 12;

export const SUNO_LYRICS_MIN_CHARS = 80;

export const SUNO_LYRICS_MANUAL_MAX_LENGTH = 3000;

export function resolveLyricsMaxLengthForDurationSec(durationSec: number): number {
  if (durationSec <= 0) {
    return SUNO_LYRICS_MANUAL_MAX_LENGTH;
  }

  return Math.max(
    SUNO_LYRICS_MIN_CHARS,
    Math.floor(durationSec * SUNO_LYRICS_CHARS_PER_SEC),
  );
}

export const FREE_TIER_LYRICS_MAX_LENGTH = resolveLyricsMaxLengthForDurationSec(
  FREE_TIER_DEFAULT_DURATION_SEC,
);

export function resolveLyricsDurationSecForPlan(
  planId: PlanId,
  selectedDurationSec: number,
): number {
  if (PLANS[planId].features.musicGeneration === "simplified") {
    return FREE_TIER_DEFAULT_DURATION_SEC;
  }

  return selectedDurationSec > 0 ? selectedDurationSec : 180;
}

export function resolveManualLyricsMaxLength(
  planId: PlanId,
  selectedDurationSec: number,
): number {
  const durationSec = resolveLyricsDurationSecForPlan(planId, selectedDurationSec);

  return resolveLyricsMaxLengthForDurationSec(durationSec);
}

export function buildDurationAwareLyricsGenerationSuffix(durationSec: number): string {
  const maxChars = resolveLyricsMaxLengthForDurationSec(durationSec);

  return `\n\nПесня ~${durationSec} сек: один короткий куплет и короткий припев, до ${maxChars} символов.`;
}

export function resolveLyricsBriefMaxLength(
  vocalGender: VocalGender | null | undefined,
  lyricsDurationSec: number,
): number {
  const genderOverhead = vocalGender ? buildGenderLyricsPromptSuffix(vocalGender).length : 0;
  const durationOverhead = buildDurationAwareLyricsGenerationSuffix(lyricsDurationSec).length;

  return Math.max(
    32,
    SUNO_LYRICS_PROMPT_MAX_LENGTH - genderOverhead - durationOverhead,
  );
}

export function buildDurationAwareLyricsGenerationPrompt(
  brief: string,
  vocalGender: VocalGender | null | undefined,
  lyricsDurationSec: number,
): string {
  const trimmedBrief = brief.trim();
  const genderSuffix = vocalGender ? buildGenderLyricsPromptSuffix(vocalGender) : "";
  const durationSuffix = buildDurationAwareLyricsGenerationSuffix(lyricsDurationSec);

  return `${trimmedBrief}${genderSuffix}${durationSuffix}`.slice(0, SUNO_LYRICS_PROMPT_MAX_LENGTH);
}

export function truncateLyricsForDuration(text: string, durationSec: number): string {
  const max = resolveLyricsMaxLengthForDurationSec(durationSec);
  const trimmed = text.trim();

  if (trimmed.length <= max) {
    return trimmed;
  }

  const slice = trimmed.slice(0, max);
  const lastBreak = Math.max(slice.lastIndexOf("\n"), slice.lastIndexOf(" "));
  const cut = lastBreak > max * 0.6 ? slice.slice(0, lastBreak) : slice;

  return `${cut.trimEnd()}...`;
}
