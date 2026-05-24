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

export const FREE_DEMO_CREDITS = 3;

export const CREDIT_PACKAGES = {
  starter: { credits: 50, label: "Starter" },
  creator: { credits: 200, label: "Creator" },
  pro: { credits: 1000, label: "Pro" },
} as const;

export const VOICE_CONSENT_PHRASE =
  "Я подтверждаю, что использую свой голос для создания музыкального трека.";

export const MIN_VOICE_SAMPLE_DURATION_SEC = 10;

export const MAX_VOICE_SAMPLE_DURATION_SEC = 120;
