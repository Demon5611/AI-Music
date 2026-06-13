import type { MusicGenerationStatus } from "./music-status.js";
import type { MusicProviderId } from "./music-provider-id.js";

export interface GenerateLyricsInput {
  prompt: string;
}

export interface GenerateLyricsResult {
  provider: MusicProviderId;
  taskId: string;
  status: MusicGenerationStatus;
}

export interface GenerateSongInput {
  prompt: string;
  style?: string;
  title?: string;
  instrumental?: boolean;
  /** When false, provider may auto-generate text from prompt (Suno non-custom mode). */
  customMode?: boolean;
  durationSec?: number;
  /** Public URL for reference-audio flows (upload-cover). Phase 2+. */
  referenceAudioUrl?: string;
}

export interface ExtendSongInput {
  audioId: string;
  prompt: string;
  continueAtSec: number;
  style?: string;
  title?: string;
}

export interface GeneratedTrack {
  id: string;
  title: string;
  audioUrl: string;
  streamAudioUrl?: string;
  imageUrl?: string;
  durationSec?: number;
  lyricsText?: string;
  tags?: string;
}

export interface GeneratedLyrics {
  title: string;
  text: string;
}

export interface GenerateSongResult {
  provider: MusicProviderId;
  taskId: string;
  status: MusicGenerationStatus;
}

export interface ExtendSongResult {
  provider: MusicProviderId;
  taskId: string;
  status: MusicGenerationStatus;
}

export interface GenerationStatusResult {
  taskId: string;
  status: MusicGenerationStatus;
  provider: MusicProviderId;
  tracks?: GeneratedTrack[];
  lyrics?: GeneratedLyrics[];
  errorMessage?: string;
  rawStatus?: string;
}

export interface SeparateStemsInput {
  providerTaskId: string;
  providerTrackId: string;
  separationType?: "separate_vocal" | "split_stem";
}

export interface StemResult {
  taskId: string;
  status: "pending" | "processing" | "completed" | "failed";
  vocalUrl?: string;
  instrumentalUrl?: string;
  errorMessage?: string;
}

export interface AudioResult {
  audioUrl: string;
  durationSec?: number;
}

export interface AddVocalsInput {
  prompt: string;
  style?: string;
  referenceAudioUrl: string;
}

export interface AddInstrumentalInput {
  prompt: string;
  style?: string;
  referenceAudioUrl: string;
}
