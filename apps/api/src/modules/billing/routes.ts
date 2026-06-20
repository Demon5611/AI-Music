import type { FastifyInstance } from "fastify";
import { createCheckoutSessionSchema } from "@ai-music/shared";
import { requireAuth } from "../../common/require-auth.js";
import { sendAppError } from "../../common/errors.js";
import {
  createCheckoutSession,
  createPortalSession,
  handleStripeWebhook,
} from "./billing.service.js";
import { getUserSubscriptionSummary } from "./entitlements.service.js";

export async function registerBillingRoutes(app: FastifyInstance) {
  app.get("/api/billing/subscription", { preHandler: requireAuth }, async (request, reply) => {
    try {
      const summary = await getUserSubscriptionSummary(request.userId!);
      return reply.send(summary);
    } catch (error) {
      return sendAppError(reply, error);
    }
  });

  app.post("/api/billing/create-checkout-session", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = createCheckoutSessionSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    try {
      const session = await createCheckoutSession(request.userId!, parsed.data.planId);
      return reply.send(session);
    } catch (error) {
      return sendAppError(reply, error);
    }
  });

  app.post("/api/billing/create-portal-session", { preHandler: requireAuth }, async (request, reply) => {
    try {
      const session = await createPortalSession(request.userId!);
      return reply.send(session);
    } catch (error) {
      return sendAppError(reply, error);
    }
  });

  app.post("/api/billing/webhook", { config: { rawBody: true } }, async (request, reply) => {
    const signature = request.headers["stripe-signature"];

    if (!signature || typeof signature !== "string") {
      return reply.status(400).send({ error: "Missing stripe-signature header" });
    }

    const rawBody = request.rawBody;

    if (!rawBody) {
      return reply.status(400).send({ error: "Missing raw body" });
    }

    try {
      const result = await handleStripeWebhook(rawBody, signature);
      return reply.send(result);
    } catch (error) {
      return sendAppError(reply, error);
    }
  });
}
