import { CREDIT_UNIT_SCALE, FULL_PRODUCTION_FLOW_UNITS } from "./credits-economy.js";

export type PlanId = "free" | "pro" | "studio";

export type PaidPlanId = Exclude<PlanId, "free">;

export type EditorLevel = "lite" | "advanced";

export type MusicGenerationLevel = "simplified" | "full";

export type VersionHistoryLevel = false | "standard" | "extended";

export interface PlanFeatures {
  musicGeneration: MusicGenerationLevel;
  voiceReplace: boolean;
  lyricsGeneration: boolean;
  editor: EditorLevel;
  stemSeparation: boolean;
  replaceSections: boolean;
  wavExport: boolean;
  priorityQueue: boolean;
  versionHistory: VersionHistoryLevel;
  maxProjects: number | null;
  earlyAccess: boolean;
  apiAccess: boolean;
}

export interface PlanConfig {
  id: PlanId;
  label: string;
  priceUsd: number;
  monthlyCredits: number;
  maxTrackDurationSec: number;
  estimatedFlows: number | null;
  features: PlanFeatures;
}

export const LITE_EDITOR_OPERATIONS = [
  "SPLIT_REGION",
  "MOVE_REGION",
  "MOVE_TRACK_REGION",
  "FADE",
  "SET_VOLUME",
  "MUTE_TRACK",
  "SOLO_TRACK",
] as const;

export const ADVANCED_EDITOR_OPERATIONS = [
  "DELETE_REGION",
  "DELETE_RANGE",
  "DUPLICATE_REGION",
  "RESIZE_REGION",
  "RESIZE_TRACK_REGION",
] as const;

/** @deprecated Use LITE_EDITOR_OPERATIONS */
export const BASIC_EDITOR_OPERATIONS = LITE_EDITOR_OPERATIONS;

export type LiteEditorOperation = (typeof LITE_EDITOR_OPERATIONS)[number];
export type AdvancedEditorOperation = (typeof ADVANCED_EDITOR_OPERATIONS)[number];
export type EditorOperationType = LiteEditorOperation | AdvancedEditorOperation;

export const VERSION_HISTORY_OPERATION_LIMIT: Record<
  Exclude<VersionHistoryLevel, false>,
  number | null
> = {
  standard: 50,
  extended: null,
};

function estimateFullProductionFlows(monthlyCredits: number): number {
  return Math.floor((monthlyCredits * CREDIT_UNIT_SCALE) / FULL_PRODUCTION_FLOW_UNITS);
}

function estimateDemoProductionFlows(monthlyCredits: number): number {
  const flows = (monthlyCredits * CREDIT_UNIT_SCALE) / FULL_PRODUCTION_FLOW_UNITS;
  return Math.floor(flows * 10) / 10;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    label: "Free",
    priceUsd: 0,
    monthlyCredits: 50,
    maxTrackDurationSec: 60,
    estimatedFlows: estimateDemoProductionFlows(50),
    features: {
      musicGeneration: "simplified",
      voiceReplace: true,
      lyricsGeneration: true,
      editor: "lite",
      stemSeparation: false,
      replaceSections: false,
      wavExport: true,
      priorityQueue: false,
      versionHistory: false,
      maxProjects: 3,
      earlyAccess: false,
      apiAccess: false,
    },
  },
  pro: {
    id: "pro",
    label: "Pro",
    priceUsd: 19,
    monthlyCredits: 500,
    maxTrackDurationSec: 180,
    estimatedFlows: estimateFullProductionFlows(500),
    features: {
      musicGeneration: "full",
      voiceReplace: true,
      lyricsGeneration: true,
      editor: "advanced",
      stemSeparation: true,
      replaceSections: true,
      wavExport: true,
      priorityQueue: true,
      versionHistory: "standard",
      maxProjects: 20,
      earlyAccess: false,
      apiAccess: false,
    },
  },
  studio: {
    id: "studio",
    label: "Studio",
    priceUsd: 49,
    monthlyCredits: 2000,
    maxTrackDurationSec: 180,
    estimatedFlows: estimateFullProductionFlows(2000),
    features: {
      musicGeneration: "full",
      voiceReplace: true,
      lyricsGeneration: true,
      editor: "advanced",
      stemSeparation: true,
      replaceSections: true,
      wavExport: true,
      priorityQueue: true,
      versionHistory: "extended",
      maxProjects: null,
      earlyAccess: true,
      apiAccess: false,
    },
  },
} as const;

export const PAID_PLAN_IDS = ["pro", "studio"] as const satisfies readonly PaidPlanId[];

export const PLAN_UPGRADE_ORDER: PlanId[] = ["free", "pro", "studio"];

export function getMinimumPlanForFeature(feature: keyof PlanFeatures): PlanId {
  for (const planId of PLAN_UPGRADE_ORDER) {
    const value = PLANS[planId].features[feature];

    if (feature === "editor") {
      if (value === "advanced") {
        return planId;
      }
      continue;
    }

    if (feature === "musicGeneration") {
      if (value === "full") {
        return planId;
      }
      continue;
    }

    if (feature === "versionHistory") {
      if (value !== false) {
        return planId;
      }
      continue;
    }

    if (feature === "maxProjects") {
      if (value === null) {
        return planId;
      }
      continue;
    }

    if (value === true || (typeof value === "number" && value > 0)) {
      return planId;
    }
  }

  return "studio";
}

export function getPlanLabel(planId: PlanId): string {
  return PLANS[planId].label;
}

/** Share of plan monthly credits on balance, capped at 100% (rollover-safe). */
export function resolveCreditsBalancePercent(balance: number, planId: PlanId): number {
  const planLimit = PLANS[planId].monthlyCredits;

  if (planLimit <= 0 || balance <= 0) {
    return 0;
  }

  const rawPercent = (balance / planLimit) * 100;
  return Math.min(100, Math.round(rawPercent));
}

export function getPlanFeatureTooltip(feature: keyof PlanFeatures): string {
  const requiredPlan = getMinimumPlanForFeature(feature);
  return `Доступно на тарифе ${getPlanLabel(requiredPlan)}`;
}
