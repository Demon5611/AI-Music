import { prisma } from "@ai-music/db";
import { PLANS, type PlanId } from "@ai-music/shared";

const DEFAULT_PLAN_ID: PlanId = "free";

function isPlanId(value: string): value is PlanId {
  return value in PLANS;
}

export async function getOrCreateSubscription(userId: string) {
  const existing = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (existing) {
    return existing;
  }

  return prisma.subscription.create({
    data: {
      userId,
      planId: DEFAULT_PLAN_ID,
      status: "active",
    },
  });
}

export function resolveSubscriptionPlanId(planId: string): PlanId {
  return isPlanId(planId) ? planId : DEFAULT_PLAN_ID;
}

export async function updateSubscriptionPlan(
  userId: string,
  input: {
    planId: PlanId;
    status?: string;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    currentPeriodEnd?: Date | null;
  },
) {
  await getOrCreateSubscription(userId);

  return prisma.subscription.update({
    where: { userId },
    data: {
      planId: input.planId,
      status: input.status,
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
      currentPeriodEnd: input.currentPeriodEnd,
    },
  });
}

export async function findSubscriptionByStripeCustomerId(stripeCustomerId: string) {
  return prisma.subscription.findFirst({
    where: { stripeCustomerId },
  });
}

export async function findSubscriptionByStripeSubscriptionId(stripeSubscriptionId: string) {
  return prisma.subscription.findFirst({
    where: { stripeSubscriptionId },
  });
}
