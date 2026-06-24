import {
  MIN_VOICE_VERIFY_DURATION_SEC,
  RECOMMENDED_VOICE_SAMPLE_DURATION_MIN_SEC,
  buildRecommendedVoiceSampleDurationLabel,
  buildVoiceSampleDurationRangeLabel,
} from "@ai-music/shared";

/** Kits training docs — basis for short reference sample tips. */
export const KITS_RECORDING_DOCS_URL =
  "https://docs.kits.ai/train/high-quality-datasets";

export const KITS_VOICE_CONVERSION_DOCS_URL =
  "https://docs.kits.ai/api-reference/api-endpoints/voice-conversion-api/create-new-voice-conversion-job";

const recommendedDuration = buildRecommendedVoiceSampleDurationLabel();
const allowedDuration = buildVoiceSampleDurationRangeLabel();

export const KITS_VOICE_RECORDING_TIPS = [
  "На этой странице запишите образец голоса напевом — это основа будущего AI-голоса.",
  `Рекомендуется ${recommendedDuration} связного напева: на верификации фраза короткая и не заменит короткий семпл.`,
  "На следующем шаге вы повторите короткую фразу тем же голосом и интонацией.",
  "Записывайте в тихом помещении без эха и фонового шума — только сухой голос, без музыки и бита.",
  "Держите микрофон на расстоянии 5–8 см; для громких фраз отодвигайтесь до 10–15 см.",
  "Говорите или пойте умеренно: без клиппинга; тише лучше, чем слишком громко.",
  "Снимите наушники с микрофона или снизьте громкость, чтобы не попал звук из них.",
  "Один голос без хоров, дублей и эффектов (реверб, эхо, автотюн).",
  `Допустимо ${allowedDuration}, но короче ${RECOMMENDED_VOICE_SAMPLE_DURATION_MIN_SEC} сек — слабее клон в треке.`,
  "Избегайте простого чтения текста без мелодии — для верификации важен одинаковый тембр на обоих шагах.",
] as const;

export const SUNO_VOICE_VERIFY_TIPS = [
  "Произнесите или напойте фразу целиком тем же голосом, что при записи на главной.",
  "Если на главной вы читали текст — здесь тоже читайте. Если пели или напевали — пойте и здесь.",
  `Фраза короткая (от ${MIN_VOICE_VERIFY_DURATION_SEC} сек) — тембр и качество клона задаёт длинный образец на главной (${recommendedDuration}).`,
  "Держите микрофон так же близко, в том же помещении, без музыки и фонового шума.",
  `Минимум ${MIN_VOICE_VERIFY_DURATION_SEC} секунд — не обрывайте запись раньше конца фразы.`,
] as const;

export const VOICE_RECORDING_SCRIPT_HINT =
  `Подсказка для напева (~15 секунд). Для качественного клона лучше записать ${recommendedDuration}:`;

export const VOICE_SAMPLE_DURATION_RECOMMENDATION =
  `Рекомендуется ${recommendedDuration} напева на главной — фраза верификации слишком короткая, чтобы передать весь тембр.`;
