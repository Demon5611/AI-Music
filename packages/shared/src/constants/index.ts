export const MUSIC_STYLES = [
  { id: "pop", label: "Pop" },
  { id: "rock", label: "Rock" },
  { id: "hip-hop", label: "Hip-Hop" },
  { id: "electronic", label: "Electronic" },
  { id: "r-and-b", label: "R&B" },
  { id: "acoustic", label: "Acoustic" },
] as const;

export const GENERATION_CREDIT_COST = 10;

export const VOICE_CONVERSION_CREDIT_COST = 5;

/** Онбординг голоса — бесплатно. */
export const VOICE_CLONE_PREPARE_CREDIT_COST = 0;

/** Онбординг голоса — бесплатно. */
export const VOICE_CLONE_VERIFY_CREDIT_COST = 0;

export const FREE_DEMO_CREDITS = 30;

export const STEM_SEPARATION_CREDIT_COST = 5;

export const WAV_EXPORT_CREDIT_COST = 3;

/** @deprecated Use PLANS from ./plans.js for subscription tiers. */
export const CREDIT_PACKAGES = {
  starter: { credits: 50, label: "Starter" },
  creator: { credits: 200, label: "Creator" },
  pro: { credits: 1000, label: "Pro" },
} as const;

export * from "./plans.js";
export * from "./music-combo-styles.js";
export * from "./music-lyrics-limits.js";

export const VOICE_CONSENT_PHRASE =
  "Я подтверждаю, что использую свой голос для создания музыкального трека.";

export const MIN_VOICE_SAMPLE_DURATION_SEC = 10;

export const MAX_VOICE_SAMPLE_DURATION_SEC = 120;

/** Минимальная длина записи фразы Suno на /consent. */
export const MIN_VOICE_VERIFY_DURATION_SEC = 5;

export const GENERATION_QUEUE_NAME = "generation";

export * from "./vocal-gender.js";
