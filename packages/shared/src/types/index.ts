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

export type VoiceCloneStatus =
  | "pending"
  | "preparing"
  | "awaiting_verification"
  | "cloning"
  | "ready"
  | "failed";

export type CreditTransactionType = "purchase" | "spend" | "refund";

import type { VocalGender } from "../constants/vocal-gender.js";
import type { PlanId } from "../constants/plans.js";
import type { ResolvedEntitlements } from "../entitlements/index.js";

export type { VocalGender };

export interface User {
  id: string;
  email: string;
  name: string | null;
  vocalGender: VocalGender | null;
  createdAt: string;
  updatedAt: string;
}

/** Public API shape — без storage keys и Suno task/persona IDs. */
export interface VoiceSample {
  id: string;
  userId: string;
  durationSec: number;
  status: VoiceSampleStatus;
  consentConfirmed: boolean;
  sunoValidatePhrase: string | null;
  voiceCloneStatus: VoiceCloneStatus;
  voiceCloneError: string | null;
  /** true только после live check-voice(voice_id) — см. persona-voice-id.service.ts */
  readyForMusicGeneration: boolean;
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
  amountUnits: number;
  reason: string;
  idempotencyKey: string | null;
  stripePaymentId: string | null;
  createdAt: string;
}

export interface CreditsBalance {
  balance: number;
}

export type SubscriptionStatus = "active" | "canceled" | "past_due" | "trialing";

export interface SubscriptionDto {
  planId: PlanId;
  planLabel: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  entitlements: ResolvedEntitlements;
  creditsBalance: number;
}

export interface GenerationJobPayload {
  jobId: string;
  userId: string;
  voiceSampleId: string;
}

export type {
  KitsInferenceJob,
  KitsJobStatus,
  KitsPaginationMeta,
  KitsStemFileUrl,
  KitsVocalSeparationJob,
  KitsVoiceModel,
  KitsVoiceModelsResponse,
} from "./kits.js";

export type {
  MusicGenerationRecordDto,
  MusicGenerationRecordStatus,
  MusicGenerationTrackDto,
  MusicGenerationType,
  MusicGenerateResponseDto,
  MusicLyricsGenerateResponseDto,
  MusicLyricsStatusResponseDto,
  MusicQueuePhase,
  MusicStatusResponseDto,
} from "./music-generation.js";

export type {
  TimedLyricsDisplayLine,
  TimedLyricsLine,
  TimedLyricsPayload,
  TimedLyricsResponseDto,
  TimedLyricsWord,
} from "./timed-lyrics.js";

export type {
  ApplyOperationBody,
  AudioTrackDto,
  DeleteRegionOperation,
  DeleteRangeOperation,
  EditOperation,
  EditorStateDto,
  EditorTrackId,
  FadeOperation,
  InitEditorResponse,
  PreviewOperationBody,
  RenderSongResponse,
  SetVolumeOperation,
  SongDto,
  SongEditorStatus,
  SongRegionDto,
  SongRegionLabel,
  SongStemDto,
  SongStemType,
  SongVersionDto,
} from "./music-editor.js";
