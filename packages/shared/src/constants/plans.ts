import { CREDIT_UNIT_SCALE, FULL_PRODUCTION_FLOW_UNITS } from "./credits-economy.js";

export type PlanId = "free" | "starter" | "pro" | "creator";

export type PaidPlanId = Exclude<PlanId, "free">;

export type EditorLevel = false | "basic" | "advanced";

export type MusicGenerationLevel = "simplified" | "full";

export interface PlanFeatures {
  musicGeneration: MusicGenerationLevel;
  voiceReplace: boolean;
  lyricsGeneration: boolean;
  editor: EditorLevel;
  stemSeparation: boolean;
  replaceSections: boolean;
  wavExport: boolean;
  priorityQueue: boolean;
  albumCover: boolean;
  voiceTransferLimit: number | null;
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

export const BASIC_EDITOR_OPERATIONS = [
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

export type BasicEditorOperation = (typeof BASIC_EDITOR_OPERATIONS)[number];
export type AdvancedEditorOperation = (typeof ADVANCED_EDITOR_OPERATIONS)[number];
export type EditorOperationType = BasicEditorOperation | AdvancedEditorOperation;

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
      editor: false,
      stemSeparation: false,
      replaceSections: false,
      wavExport: false,
      priorityQueue: false,
      albumCover: false,
      voiceTransferLimit: 1,
    },
  },
  starter: {
    id: "starter",
    label: "Starter",
    priceUsd: 9,
    monthlyCredits: 150,
    maxTrackDurationSec: 120,
    estimatedFlows: estimateFullProductionFlows(150),
    features: {
      musicGeneration: "full",
      voiceReplace: true,
      lyricsGeneration: true,
      editor: "basic",
      stemSeparation: true,
      replaceSections: true,
      wavExport: true,
      priorityQueue: false,
      albumCover: false,
      voiceTransferLimit: 3,
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
      albumCover: true,
      voiceTransferLimit: 5,
    },
  },
  creator: {
    id: "creator",
    label: "Creator",
    priceUsd: 39,
    monthlyCredits: 1500,
    maxTrackDurationSec: 180,
    estimatedFlows: estimateFullProductionFlows(1500),
    features: {
      musicGeneration: "full",
      voiceReplace: true,
      lyricsGeneration: true,
      editor: "advanced",
      stemSeparation: true,
      replaceSections: true,
      wavExport: true,
      priorityQueue: true,
      albumCover: true,
      voiceTransferLimit: null,
    },
  },
} as const;

export const PAID_PLAN_IDS = ["starter", "pro", "creator"] as const satisfies readonly PaidPlanId[];

export const PLAN_UPGRADE_ORDER: PlanId[] = ["free", "starter", "pro", "creator"];

export function getMinimumPlanForFeature(feature: keyof PlanFeatures): PlanId {
  for (const planId of PLAN_UPGRADE_ORDER) {
    const value = PLANS[planId].features[feature];

    if (feature === "editor") {
      if (value !== false) {
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

    if (value === true || (typeof value === "number" && value > 0)) {
      return planId;
    }
  }

  return "creator";
}

export function getPlanLabel(planId: PlanId): string {
  return PLANS[planId].label;
}
