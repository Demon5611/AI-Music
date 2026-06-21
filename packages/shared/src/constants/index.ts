export const MUSIC_STYLES = [
  { id: "pop", label: "Pop" },
  { id: "rock", label: "Rock" },
  { id: "hip-hop", label: "Hip-Hop" },
  { id: "electronic", label: "Electronic" },
  { id: "r-and-b", label: "R&B" },
  { id: "acoustic", label: "Acoustic" },
] as const;

export const VOICE_CONVERSION_CREDIT_COST = 5;

/** Онбординг голоса — бесплатно. */
export const VOICE_CLONE_PREPARE_CREDIT_COST = 0;

/** Онбординг голоса — бесплатно. */
export const VOICE_CLONE_VERIFY_CREDIT_COST = 0;

/** @deprecated Use PLANS from ./plans.js for subscription tiers. */
export const CREDIT_PACKAGES = {
  starter: { credits: 50, label: "Starter" },
  creator: { credits: 200, label: "Creator" },
  pro: { credits: 1000, label: "Pro" },
} as const;

export * from "./credits-economy.js";
export * from "./plans.js";
export * from "./music-combo-styles.js";
export * from "./music-duration.js";
export * from "./music-lyrics-limits.js";

export const VOICE_CONSENT_PHRASE =
  "Я подтверждаю, что использую свой голос для создания музыкального трека.";

export const MIN_VOICE_SAMPLE_DURATION_SEC = 10;

export const MAX_VOICE_SAMPLE_DURATION_SEC = 120;

/** Рекомендуемая длительность образца на главной — фраза верификации слишком короткая для клона. */
export const RECOMMENDED_VOICE_SAMPLE_DURATION_MIN_SEC = 20;

export const RECOMMENDED_VOICE_SAMPLE_DURATION_MAX_SEC = 30;

/** Минимальная длина записи фразы Suno на /consent. */
export const MIN_VOICE_VERIFY_DURATION_SEC = 5;

export function isRecommendedVoiceSampleDuration(durationSec: number): boolean {
  return durationSec >= RECOMMENDED_VOICE_SAMPLE_DURATION_MIN_SEC;
}

export function buildRecommendedVoiceSampleDurationLabel(): string {
  return `${RECOMMENDED_VOICE_SAMPLE_DURATION_MIN_SEC}–${RECOMMENDED_VOICE_SAMPLE_DURATION_MAX_SEC} сек`;
}

export function buildVoiceSampleDurationRangeLabel(): string {
  return `${MIN_VOICE_SAMPLE_DURATION_SEC}–${MAX_VOICE_SAMPLE_DURATION_SEC} сек`;
}

export const GENERATION_QUEUE_NAME = "generation";

export * from "./provider-job-queue.js";
export * from "./vocal-gender.js";
