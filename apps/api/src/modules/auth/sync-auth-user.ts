import { prisma } from "@ai-music/db";
import { FREE_DEMO_CREDIT_UNITS } from "@ai-music/shared";
import type { AuthIdentity } from "./types.js";

export async function syncAuthUser(identity: AuthIdentity) {
  const existing = await prisma.user.findUnique({
    where: { id: identity.userId },
    select: { id: true },
  });

  if (existing) {
    return prisma.user.update({
      where: { id: identity.userId },
      data: {
        email: identity.email,
        name: identity.name,
      },
    });
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        id: identity.userId,
        email: identity.email,
        name: identity.name,
      },
    });

    await tx.subscription.create({
      data: {
        userId: user.id,
        planId: "free",
        status: "active",
      },
    });

    await tx.creditTransaction.create({
      data: {
        userId: user.id,
        type: "purchase",
        amountUnits: FREE_DEMO_CREDIT_UNITS,
        reason: "free_demo",
      },
    });

    return user;
  });
}
