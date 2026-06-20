import {
  ADVANCED_EDITOR_OPERATIONS,
  BASIC_EDITOR_OPERATIONS,
  PLANS,
  type EditorLevel,
  type EditorOperationType,
  type PlanFeatures,
  type PlanId,
} from "../constants/plans.js";
import {
  FREE_TIER_DEFAULT_DURATION_SEC,
  isComboStylePreset,
} from "../constants/music-combo-styles.js";

export type FeatureKey = keyof PlanFeatures;

export interface ResolvedEntitlements {
  planId: PlanId;
  planLabel: string;
  monthlyCredits: number;
  maxTrackDurationSec: number;
  estimatedFlows: number | null;
  features: PlanFeatures;
  queuePriority: number;
}

export type EntitlementViolationCode =
  | "FEATURE_NOT_AVAILABLE"
  | "DURATION_LIMIT_EXCEEDED"
  | "EDITOR_OPERATION_NOT_ALLOWED"
  | "SIMPLIFIED_GENERATION_ONLY";

export interface EntitlementViolation {
  ok: false;
  code: EntitlementViolationCode;
  message: string;
  requiredPlan?: PlanId;
  limit?: number;
}

export interface EntitlementSuccess {
  ok: true;
}

export type EntitlementCheckResult = EntitlementSuccess | EntitlementViolation;

const QUEUE_PRIORITY_BY_PLAN: Record<PlanId, number> = {
  free: 1,
  starter: 2,
  pro: 5,
  creator: 10,
};

export function resolveEntitlements(planId: PlanId): ResolvedEntitlements {
  const plan = PLANS[planId];

  return {
    planId: plan.id,
    planLabel: plan.label,
    monthlyCredits: plan.monthlyCredits,
    maxTrackDurationSec: plan.maxTrackDurationSec,
    estimatedFlows: plan.estimatedFlows,
    features: plan.features,
    queuePriority: QUEUE_PRIORITY_BY_PLAN[plan.id],
  };
}

export function hasEditorAccess(editorLevel: EditorLevel): editorLevel is "basic" | "advanced" {
  return editorLevel !== false;
}

export function checkFeature(
  planId: PlanId,
  feature: FeatureKey,
): EntitlementCheckResult {
  const entitlements = resolveEntitlements(planId);
  const value = entitlements.features[feature];

  if (feature === "editor") {
    if (value === false) {
      return {
        ok: false,
        code: "FEATURE_NOT_AVAILABLE",
        message: "Музыкальный редактор доступен на тарифе Starter и выше",
        requiredPlan: "starter",
      };
    }

    return { ok: true };
  }

  if (feature === "musicGeneration") {
    return { ok: true };
  }

  if (typeof value === "number") {
    return { ok: true };
  }

  if (value === true) {
    return { ok: true };
  }

  const requiredPlan = findMinimumPlanForBooleanFeature(feature);

  return {
    ok: false,
    code: "FEATURE_NOT_AVAILABLE",
    message: `Функция недоступна на тарифе ${entitlements.planLabel}`,
    requiredPlan,
  };
}

export function checkMaxDuration(planId: PlanId, durationSec: number): EntitlementCheckResult {
  const entitlements = resolveEntitlements(planId);

  if (durationSec <= 0) {
    return { ok: true };
  }

  if (durationSec <= entitlements.maxTrackDurationSec) {
    return { ok: true };
  }

  return {
    ok: false,
    code: "DURATION_LIMIT_EXCEEDED",
    message: `Максимальная длина трека на тарифе ${entitlements.planLabel} — ${entitlements.maxTrackDurationSec} сек`,
    limit: entitlements.maxTrackDurationSec,
  };
}

export function checkMusicGenerationMode(
  planId: PlanId,
  options: { customMode?: boolean; instrumental?: boolean; style?: string; durationSec?: number },
): EntitlementCheckResult {
  const entitlements = resolveEntitlements(planId);

  if (entitlements.features.musicGeneration === "full") {
    return { ok: true };
  }

  if (options.instrumental) {
    return {
      ok: false,
      code: "SIMPLIFIED_GENERATION_ONLY",
      message: "Инструментальная генерация доступна на платных тарифах",
      requiredPlan: "starter",
    };
  }

  const durationSec = options.durationSec ?? 0;

  if (durationSec !== FREE_TIER_DEFAULT_DURATION_SEC) {
    return {
      ok: false,
      code: "SIMPLIFIED_GENERATION_ONLY",
      message: "На Free доступна генерация только 30 секунд",
      requiredPlan: "starter",
    };
  }

  const style = options.style?.trim() ?? "";

  if (!isComboStylePreset(style)) {
    return {
      ok: false,
      code: "SIMPLIFIED_GENERATION_ONLY",
      message: "На Free доступен только комбо-стиль. Расширенные параметры — на платных тарифах",
      requiredPlan: "starter",
    };
  }

  return { ok: true };
}

export function checkEditorOperation(
  planId: PlanId,
  operationType: string,
): EntitlementCheckResult {
  const editorLevel = PLANS[planId].features.editor;

  if (editorLevel === false) {
    return {
      ok: false,
      code: "FEATURE_NOT_AVAILABLE",
      message: "Музыкальный редактор доступен на тарифе Starter и выше",
      requiredPlan: "starter",
    };
  }

  const normalizedType = operationType === "CUT_REGION" ? "DELETE_REGION" : operationType;
  const allowed = isEditorOperationAllowed(editorLevel, normalizedType as EditorOperationType);

  if (allowed) {
    return { ok: true };
  }

  return {
    ok: false,
    code: "EDITOR_OPERATION_NOT_ALLOWED",
    message: "Эта операция редактора доступна на тарифе Pro и выше",
    requiredPlan: "pro",
  };
}

export function isEditorOperationAllowed(
  editorLevel: EditorLevel,
  operationType: EditorOperationType | string,
): boolean {
  if (editorLevel === false) {
    return false;
  }

  const normalizedType = operationType === "CUT_REGION" ? "DELETE_REGION" : operationType;

  if (BASIC_EDITOR_OPERATIONS.includes(normalizedType as (typeof BASIC_EDITOR_OPERATIONS)[number])) {
    return true;
  }

  if (editorLevel !== "advanced") {
    return false;
  }

  return ADVANCED_EDITOR_OPERATIONS.includes(
    normalizedType as (typeof ADVANCED_EDITOR_OPERATIONS)[number],
  );
}

export function getAllowedDurationOptions(maxTrackDurationSec: number): number[] {
  const options = [0, 30, 60, 120, 180];
  return options.filter((value) => value === 0 || value <= maxTrackDurationSec);
}

export const ALL_DURATION_OPTIONS = [0, 30, 60, 120, 180] as const;

export function isDurationAllowedForPlan(planId: PlanId, durationSec: number): boolean {
  return getDurationOptionsForPlan(planId).includes(durationSec);
}

export function getDurationOptionsForPlan(planId: PlanId): number[] {
  if (PLANS[planId].features.musicGeneration === "simplified") {
    return [FREE_TIER_DEFAULT_DURATION_SEC];
  }

  return getAllowedDurationOptions(PLANS[planId].maxTrackDurationSec);
}

function findMinimumPlanForBooleanFeature(feature: FeatureKey): PlanId {
  const planOrder: PlanId[] = ["starter", "pro", "creator"];

  for (const planId of planOrder) {
    const value = PLANS[planId].features[feature];

    if (value === true) {
      return planId;
    }
  }

  return "creator";
}
