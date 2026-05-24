import type { FastifyInstance } from "fastify";

export async function registerStorageRoutes(app: FastifyInstance) {
  app.post("/api/storage/signed-url", async (_request, reply) => {
    return reply.status(501).send({ error: "Not implemented" });
  });
}
