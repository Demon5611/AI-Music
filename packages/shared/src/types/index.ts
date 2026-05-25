export type GenerationStatus =
  | "pending"
  | "preprocessing_voice"
  | "generating_lyrics"
  | "generating_song"
  | "converting_voice"
  | "uploading_result"
  | "completed"
  | "failed";

export type VoiceSampleStatus = "pending" | "ready" | "failed";

export type CreditTransactionType = "purchase" | "spend" | "refund";

export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VoiceSample {
  id: string;
  userId: string;
  r2Key: string;
  durationSec: number;
  status: VoiceSampleStatus;
  consentConfirmed: boolean;
  createdAt: string;
}

export interface Track {
  id: string;
  userId: string;
  title: string;
  prompt: string;
  style: string;
  durationSec: number;
  audioR2Key: string;
  coverR2Key: string | null;
  shareSlug: string;
  createdAt: string;
}

export interface GenerationJob {
  id: string;
  userId: string;
  voiceSampleId: string;
  trackId: string | null;
  prompt: string;
  style: string;
  durationSec: number;
  status: GenerationStatus;
  errorMessage: string | null;
  providerJobId: string | null;
  creditsCost: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  type: CreditTransactionType;
  amount: number;
  reason: string;
  stripePaymentId: string | null;
  createdAt: string;
}

export interface CreditsBalance {
  balance: number;
}

export interface GenerationJobPayload {
  jobId: string;
  userId: string;
  voiceSampleId: string;
}

export type { KitsInferenceJob, KitsJobStatus } from "./kits.js";
