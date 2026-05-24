import type { FastifyInstance } from "fastify";
import { createCheckoutSessionSchema } from "@ai-music/shared";

export async function registerBillingRoutes(app: FastifyInstance) {
  app.post("/api/billing/create-checkout-session", async (request, reply) => {
    const parsed = createCheckoutSessionSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    return reply.status(501).send({ error: "Not implemented" });
  });

  app.post("/api/billing/webhook", async (_request, reply) => {
    return reply.status(501).send({ error: "Not implemented" });
  });
}
