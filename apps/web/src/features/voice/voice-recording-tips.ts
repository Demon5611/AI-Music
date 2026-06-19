import {
  MAX_VOICE_SAMPLE_DURATION_SEC,
  MIN_VOICE_SAMPLE_DURATION_SEC,
  MIN_VOICE_VERIFY_DURATION_SEC,
} from "@ai-music/shared";

/** Kits training docs — basis for short reference sample tips. */
export const KITS_RECORDING_DOCS_URL =
  "https://docs.kits.ai/train/high-quality-datasets";

export const KITS_VOICE_CONVERSION_DOCS_URL =
  "https://docs.kits.ai/api-reference/api-endpoints/voice-conversion-api/create-new-voice-conversion-job";

const durationRange = `${MIN_VOICE_SAMPLE_DURATION_SEC}–${MAX_VOICE_SAMPLE_DURATION_SEC} сек`;

export const KITS_VOICE_RECORDING_TIPS = [
  "На этой странице запишите образец голоса напевом.",
  "На следующем шаге вы повторите короткую фразу тем же голосом и интонацией.",
  "Записывайте в тихом помещении без эха и фонового шума — только сухой голос, без музыки и бита.",
  "Держите микрофон на расстоянии 5–8 см; для громких фраз отодвигайтесь до 10–15 см.",
  "Говорите или пойте умеренно: без клиппинга; тише лучше, чем слишком громко.",
  "Снимите наушники с микрофона или снизьте громкость, чтобы не попал звук из них.",
  "Один голос без хоров, дублей и эффектов (реверб, эхо, автотюн).",
  `Длительность ${durationRange}: связный напев или пение с разными слогами и интонациями.`,
  "Избегайте простого чтения текста без мелодии — для верификации важен одинаковый тембр на обоих шагах.",
] as const;

export const SUNO_VOICE_VERIFY_TIPS = [
  "Произнесите или напойте фразу целиком тем же голосом, что при записи на главной.",
  "Если на главной вы читали текст — здесь тоже читайте. Если пели или напевали — пойте и здесь.",
  "Держите микрофон так же близко, в том же помещении, без музыки и фонового шума.",
  `Минимум ${MIN_VOICE_VERIFY_DURATION_SEC} секунд — не обрывайте запись раньше конца фразы.`,
] as const;

export const VOICE_RECORDING_SCRIPT_HINT =
  "Спойте или напевайте следующий текст (~15 секунд):";
