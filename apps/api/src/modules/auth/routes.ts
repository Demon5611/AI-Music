import type { FastifyInstance } from "fastify";

export async function registerAuthRoutes(app: FastifyInstance) {
  app.get("/api/auth/session", async (_request, reply) => {
    return reply.status(501).send({ error: "Not implemented" });
  });
}
