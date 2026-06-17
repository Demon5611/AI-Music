import {
  MAX_VOICE_SAMPLE_DURATION_SEC,
  MIN_VOICE_SAMPLE_DURATION_SEC,
} from "@ai-music/shared";

/** Kits training docs — basis for short reference sample tips. */
export const KITS_RECORDING_DOCS_URL =
  "https://docs.kits.ai/train/high-quality-datasets";

export const KITS_VOICE_CONVERSION_DOCS_URL =
  "https://docs.kits.ai/api-reference/api-endpoints/voice-conversion-api/create-new-voice-conversion-job";

const durationRange = `${MIN_VOICE_SAMPLE_DURATION_SEC}–${MAX_VOICE_SAMPLE_DURATION_SEC} сек`;

export const KITS_VOICE_RECORDING_TIPS = [
  "Записывайте в тихом помещении без эха и фонового шума — только сухой голос, без музыки и бита.",
  "Держите микрофон на расстоянии 5–8 см; для громких фраз отодвигайтесь до 10–15 см.",
  "Говорите или пойте умеренно: без клиппинга; тише лучше, чем слишком громко.",
  "Снимите наушники с микрофона или снизьте громкость, чтобы не попал звук из них.",
  "Один голос без хоров, дублей и эффектов (реверб, эхо, автотюн).",
  `Длительность ${durationRange}: связная речь или пение с разными слогами и интонациями.`,
  "Формат WAV, MP3 или FLAC; для файла предпочтителен lossless WAV 44.1 или 48 kHz.",
] as const;

/** ~15 сек при умеренном темпе; для подсказки у кнопки «Запись». */
export const VOICE_RECORDING_EXAMPLE_SCRIPT =
  "Сегодня я создаю музыку своим голосом. Каждая нота звучит по-новому, " +
  "а мелодия оживает вместе со мной. Пусть этот ритм ведёт меня вперёд, " +
  "день за днём, с радостью и надеждой.";

export const VOICE_RECORDING_TOOLTIP =
  "Произнесите следующий текст с выражением и эмоциями (~15 секунд): " +
  VOICE_RECORDING_EXAMPLE_SCRIPT;
