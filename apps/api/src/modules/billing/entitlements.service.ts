import {
  checkEditorOperation,
  checkFeature,
  checkMaxDuration,
  checkMusicGenerationMode,
  resolveEntitlements,
  type EntitlementCheckResult,
  type FeatureKey,
  type ResolvedEntitlements,
} from "@ai-music/shared";
import {
  DurationLimitExceededError,
  EditorOperationNotAllowedError,
  FeatureNotAvailableError,
} from "../../common/errors.js";
import { getCreditsBalance } from "../credits/service.js";
import { getOrCreateSubscription, resolveSubscriptionPlanId } from "./subscription.service.js";

function throwIfViolation(result: EntitlementCheckResult): void {
  if (result.ok) {
    return;
  }

  if (result.code === "DURATION_LIMIT_EXCEEDED") {
    throw new DurationLimitExceededError(result.message, result.limit);
  }

  if (result.code === "EDITOR_OPERATION_NOT_ALLOWED") {
    throw new EditorOperationNotAllowedError(result.message, result.requiredPlan);
  }

  throw new FeatureNotAvailableError(result.message, result.requiredPlan);
}

export async function getUserEntitlements(userId: string): Promise<ResolvedEntitlements> {
  const subscription = await getOrCreateSubscription(userId);
  const planId = resolveSubscriptionPlanId(subscription.planId);

  return resolveEntitlements(planId);
}

export async function getUserSubscriptionSummary(userId: string) {
  const subscription = await getOrCreateSubscription(userId);
  const planId = resolveSubscriptionPlanId(subscription.planId);
  const entitlements = resolveEntitlements(planId);
  const creditsBalance = await getCreditsBalance(userId);

  return {
    planId,
    planLabel: entitlements.planLabel,
    status: subscription.status,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    entitlements,
    creditsBalance,
  };
}

export async function assertFeature(userId: string, feature: FeatureKey): Promise<void> {
  const subscription = await getOrCreateSubscription(userId);
  const planId = resolveSubscriptionPlanId(subscription.planId);
  throwIfViolation(checkFeature(planId, feature));
}

export async function assertMaxDuration(userId: string, durationSec: number): Promise<void> {
  const subscription = await getOrCreateSubscription(userId);
  const planId = resolveSubscriptionPlanId(subscription.planId);
  throwIfViolation(checkMaxDuration(planId, durationSec));
}

export async function assertMusicGenerationMode(
  userId: string,
  options: { customMode?: boolean; instrumental?: boolean },
): Promise<void> {
  const subscription = await getOrCreateSubscription(userId);
  const planId = resolveSubscriptionPlanId(subscription.planId);
  throwIfViolation(checkMusicGenerationMode(planId, options));
}

export async function assertEditorOperation(userId: string, operationType: string): Promise<void> {
  const subscription = await getOrCreateSubscription(userId);
  const planId = resolveSubscriptionPlanId(subscription.planId);
  throwIfViolation(checkEditorOperation(planId, operationType));
}

export async function getQueuePriorityForUser(userId: string): Promise<number> {
  const entitlements = await getUserEntitlements(userId);
  return entitlements.queuePriority;
}
