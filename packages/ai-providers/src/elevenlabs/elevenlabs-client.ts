import { throwElevenLabsApiError } from "./elevenlabs-api-error.js";
import type {
  ComposeMusicInput,
  ComposeMusicResult,
  ElevenLabsMusicOutputFormat,
  ElevenLabsTtsModelId,
  TextToSpeechInput,
  TextToSpeechResult,
} from "./types.js";

const MIN_MUSIC_LENGTH_MS = 3_000;
const MAX_MUSIC_LENGTH_MS = 600_000;
const DEFAULT_OUTPUT_FORMAT: ElevenLabsMusicOutputFormat = "mp3_44100_128";
const DEFAULT_TTS_MODEL: ElevenLabsTtsModelId = "eleven_multilingual_v2";
const MUSIC_REQUEST_TIMEOUT_MS = 180_000;
const TTS_REQUEST_TIMEOUT_MS = 60_000;

function buildMusicPrompt(input: ComposeMusicInput): string {
  return `${input.style} style. ${input.prompt}`;
}

function clampMusicLengthMs(durationSec: number): number {
  const durationMs = durationSec * 1000;
  return Math.min(Math.max(durationMs, MIN_MUSIC_LENGTH_MS), MAX_MUSIC_LENGTH_MS);
}

function readSongId(response: Response): string | null {
  return (
    response.headers.get("song-id") ??
    response.headers.get("x-song-id") ??
    null
  );
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`ElevenLabs request timed out after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export class ElevenLabsClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  async textToSpeech(input: TextToSpeechInput): Promise<TextToSpeechResult> {
    const url = new URL(
      `${this.baseUrl}/v1/text-to-speech/${encodeURIComponent(input.voiceId)}`,
    );
    url.searchParams.set("output_format", DEFAULT_OUTPUT_FORMAT);

    const response = await fetchWithTimeout(
      url.toString(),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": this.apiKey,
        },
        body: JSON.stringify({
          text: input.text,
          model_id: input.modelId ?? DEFAULT_TTS_MODEL,
        }),
      },
      TTS_REQUEST_TIMEOUT_MS,
    );

    if (!response.ok) {
      await throwElevenLabsApiError(response, "ElevenLabs text to speech");
    }

    const arrayBuffer = await response.arrayBuffer();

    return {
      audioBuffer: Buffer.from(arrayBuffer),
    };
  }

  async compose(
    input: ComposeMusicInput,
    outputFormat: ElevenLabsMusicOutputFormat = DEFAULT_OUTPUT_FORMAT,
  ): Promise<ComposeMusicResult> {
    const musicLengthMs = clampMusicLengthMs(input.durationSec);
    const url = new URL(`${this.baseUrl}/v1/music`);
    url.searchParams.set("output_format", outputFormat);

    const response = await fetchWithTimeout(
      url.toString(),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": this.apiKey,
        },
        body: JSON.stringify({
          prompt: buildMusicPrompt(input),
          music_length_ms: musicLengthMs,
          model_id: "music_v1",
          force_instrumental: input.forceInstrumental ?? false,
        }),
      },
      MUSIC_REQUEST_TIMEOUT_MS,
    );

    if (!response.ok) {
      await throwElevenLabsApiError(response, "ElevenLabs compose music");
    }

    const arrayBuffer = await response.arrayBuffer();

    return {
      audioBuffer: Buffer.from(arrayBuffer),
      providerJobId: readSongId(response),
    };
  }
}
