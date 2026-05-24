import type { FastifyInstance } from "fastify";
import { createGenerationSchema } from "@ai-music/shared";

export async function registerGenerationRoutes(app: FastifyInstance) {
  app.post("/api/generations", async (request, reply) => {
    const parsed = createGenerationSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    return reply.status(501).send({ error: "Not implemented" });
  });

  app.get("/api/generations/:id", async (_request, reply) => {
    return reply.status(501).send({ error: "Not implemented" });
  });

  app.get("/api/generations/:id/status", async (_request, reply) => {
    return reply.status(501).send({ error: "Not implemented" });
  });
}
