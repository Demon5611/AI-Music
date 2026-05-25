import { createClerkClient, verifyToken } from "@clerk/backend";
import type { AuthIdentity, AuthVerifier } from "./types.js";

export function createClerkAuthVerifier(): AuthVerifier {
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is required for Clerk auth");
  }

  const clerk = createClerkClient({ secretKey });

  return {
    async verify(token: string): Promise<AuthIdentity | null> {
      try {
        const payload = await verifyToken(token, { secretKey });
        const userId = payload.sub;

        if (!userId) {
          return null;
        }

        const user = await clerk.users.getUser(userId);
        const email = user.emailAddresses[0]?.emailAddress;

        if (!email) {
          return null;
        }

        return {
          userId,
          email,
          name: user.firstName
            ? [user.firstName, user.lastName].filter(Boolean).join(" ")
            : null,
        };
      } catch {
        return null;
      }
    },
  };
}
