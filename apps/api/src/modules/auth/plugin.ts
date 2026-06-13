import type { FastifyInstance } from "fastify";
import { createAuthVerifier } from "./create-auth-verifier.js";
import { syncAuthUser } from "./sync-auth-user.js";

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
  }
}

export async function registerAuthPlugin(app: FastifyInstance) {
  const verifier = createAuthVerifier();

  app.addHook("onRequest", async (request) => {
    const header = request.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      return;
    }

    const token = header.slice("Bearer ".length).trim();
    const identity = await verifier.verify(token);

    if (!identity) {
      return;
    }

    try {
      await syncAuthUser(identity);
      request.userId = identity.userId;
    } catch (error) {
      request.log.error(error, "Failed to sync auth user");
    }
  });
}
