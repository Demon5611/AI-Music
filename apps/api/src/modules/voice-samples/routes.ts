import type { FastifyInstance } from "fastify";

export async function registerVoiceSampleRoutes(app: FastifyInstance) {
  app.get("/api/voice-samples", async () => []);

  app.post("/api/voice-samples", async (_request, reply) => {
    return reply.status(501).send({ error: "Not implemented" });
  });

  app.delete("/api/voice-samples/:id", async (_request, reply) => {
    return reply.status(501).send({ error: "Not implemented" });
  });
}
