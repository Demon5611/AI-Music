import { grantCredits, prisma } from "@ai-music/db";
import { FREE_DEMO_CREDITS } from "@ai-music/shared";

const FREE_TIER_CREDITS_UPGRADE_REASON = "free_tier_credits_upgrade";

export async function ensureFreeTierCredits(userId: string): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { planId: true },
  });

  if (!subscription || subscription.planId !== "free") {
    return;
  }

  const existingUpgrade = await prisma.creditTransaction.findFirst({
    where: { userId, reason: FREE_TIER_CREDITS_UPGRADE_REASON },
    select: { id: true },
  });

  if (existingUpgrade) {
    return;
  }

  const aggregate = await prisma.creditTransaction.aggregate({
    where: { userId },
    _sum: { amount: true },
  });

  const balance = aggregate._sum.amount ?? 0;

  if (balance >= FREE_DEMO_CREDITS) {
    return;
  }

  await grantCredits(
    userId,
    FREE_DEMO_CREDITS - balance,
    FREE_TIER_CREDITS_UPGRADE_REASON,
  );
}
