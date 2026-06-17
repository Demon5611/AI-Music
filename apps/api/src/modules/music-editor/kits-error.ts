import { KitsApiError } from "@ai-music/ai-providers";
import type { FastifyReply } from "fastify";

export function sendKitsError(reply: FastifyReply, error: unknown) {
  if (error instanceof KitsApiError) {
    return reply.status(error.status).send({
      error: error.userMessage,
      code: error.code,
      details: error.message,
    });
  }

  return reply.status(502).send({
    error: error instanceof Error ? error.message : "Kits API error",
  });
}
