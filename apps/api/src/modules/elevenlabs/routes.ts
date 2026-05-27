import { createElevenLabsClient } from "@ai-music/ai-providers";
import type { FastifyInstance } from "fastify";
import { sendElevenLabsError } from "./handle-elevenlabs-error.js";

const DEFAULT_TTS_TEXT =
  "Привет! Это тест ElevenLabs Text to Speech API на Free plan.";
const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const DEFAULT_MUSIC_PROMPT = "A short upbeat pop song about summer and friends";
const DEFAULT_MUSIC_STYLE = "pop";
const DEFAULT_MUSIC_DURATION_SEC = 30;

interface TtsTestBody {
  text?: string;
  voiceId?: string;
}

interface MusicTestBody {
  prompt?: string;
  style?: string;
  durationSec?: number;
}

export async function registerElevenLabsRoutes(app: FastifyInstance) {
  app.get("/api/elevenlabs/test/status", async (_request, reply) => {
    return reply.send({
      configured: Boolean(process.env.ELEVENLABS_API_KEY),
    });
  });

  app.post<{ Body: TtsTestBody }>(
    "/api/elevenlabs/test/tts",
    async (request, reply) => {
      try {
        const client = createElevenLabsClient();
        const voiceId =
          request.body.voiceId ??
          process.env.ELEVENLABS_TEST_VOICE_ID ??
          DEFAULT_VOICE_ID;
        const result = await client.textToSpeech({
          text: request.body.text?.trim() || DEFAULT_TTS_TEXT,
          voiceId,
        });

        return reply
          .header("Content-Type", "audio/mpeg")
          .header("X-ElevenLabs-Test-Kind", "tts")
          .header("X-Audio-Byte-Length", String(result.audioBuffer.byteLength))
          .send(result.audioBuffer);
      } catch (error) {
        request.log.error(error);
        return sendElevenLabsError(reply, error);
      }
    },
  );

  app.post<{ Body: MusicTestBody }>(
    "/api/elevenlabs/test/music",
    async (request, reply) => {
      try {
        const client = createElevenLabsClient();
        const durationSec = Number(
          request.body.durationSec ?? DEFAULT_MUSIC_DURATION_SEC,
        );

        if (!Number.isFinite(durationSec) || durationSec < 3 || durationSec > 300) {
          return reply.status(400).send({
            error: "durationSec must be between 3 and 300",
          });
        }

        const result = await client.compose({
          prompt: request.body.prompt?.trim() || DEFAULT_MUSIC_PROMPT,
          style: request.body.style?.trim() || DEFAULT_MUSIC_STYLE,
          durationSec,
        });

        return reply
          .header("Content-Type", "audio/mpeg")
          .header("X-ElevenLabs-Test-Kind", "music")
          .header("X-Audio-Byte-Length", String(result.audioBuffer.byteLength))
          .header("X-Provider-Job-Id", result.providerJobId ?? "")
          .send(result.audioBuffer);
      } catch (error) {
        request.log.error(error);
        return sendElevenLabsError(reply, error);
      }
    },
  );
}
