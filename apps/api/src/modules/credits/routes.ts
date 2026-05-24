import type { FastifyInstance } from "fastify";
import { FREE_DEMO_CREDITS } from "@ai-music/shared";

export async function registerCreditsRoutes(app: FastifyInstance) {
  app.get("/api/credits/balance", async () => ({
    balance: FREE_DEMO_CREDITS,
  }));
}
