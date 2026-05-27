import { ElevenLabsApiError } from "@ai-music/ai-providers";
import type { FastifyReply } from "fastify";

export function sendElevenLabsError(reply: FastifyReply, error: unknown) {
  if (error instanceof ElevenLabsApiError) {
    return reply.status(error.status).send({
      error: error.message,
      details: error.body,
    });
  }

  return reply.status(502).send({
    error: error instanceof Error ? error.message : "ElevenLabs API error",
  });
}
