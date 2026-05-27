export type ElevenLabsMusicModelId = "music_v1";

export type ElevenLabsMusicOutputFormat =
  | "mp3_44100_128"
  | "mp3_44100_192"
  | "mp3_44100_96";

export type ElevenLabsTtsModelId =
  | "eleven_multilingual_v2"
  | "eleven_flash_v2_5"
  | "eleven_turbo_v2_5";

export interface ComposeMusicInput {
  prompt: string;
  style: string;
  durationSec: number;
  forceInstrumental?: boolean;
}

export interface ComposeMusicResult {
  audioBuffer: Buffer;
  providerJobId: string | null;
}

export interface TextToSpeechInput {
  text: string;
  voiceId: string;
  modelId?: ElevenLabsTtsModelId;
}

export interface TextToSpeechResult {
  audioBuffer: Buffer;
}
