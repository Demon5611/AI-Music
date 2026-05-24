import type { FastifyInstance } from "fastify";

export async function registerUserRoutes(app: FastifyInstance) {
  app.get("/api/users/me", async (_request, reply) => {
    return reply.status(501).send({ error: "Not implemented" });
  });
}
