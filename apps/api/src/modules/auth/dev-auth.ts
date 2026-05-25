import type { AuthIdentity, AuthVerifier } from "./types.js";

const DEV_TOKEN_PREFIX = "dev:";

export function createDevAuthVerifier(): AuthVerifier {
  return {
    async verify(token: string): Promise<AuthIdentity | null> {
      if (!token.startsWith(DEV_TOKEN_PREFIX)) {
        return null;
      }

      const userId = token.slice(DEV_TOKEN_PREFIX.length).trim();

      if (!userId) {
        return null;
      }

      return {
        userId,
        email: process.env.AUTH_DEV_USER_EMAIL ?? `${userId}@dev.local`,
        name: process.env.AUTH_DEV_USER_NAME ?? "Dev User",
      };
    },
  };
}

export function isDevAuthEnabled(): boolean {
  return process.env.AUTH_DEV_MODE === "true" || !process.env.CLERK_SECRET_KEY;
}
