import { MusicProviderError } from "@ai-music/ai-providers";
import type { FastifyReply } from "fastify";

export function sendMusicError(reply: FastifyReply, error: unknown) {
  if (error instanceof MusicProviderError) {
    return reply.status(error.statusCode).send({
      error: error.message,
      code: error.code,
      provider: error.provider,
    });
  }

  return reply.status(502).send({
    error: error instanceof Error ? error.message : "Music provider error",
  });
}
