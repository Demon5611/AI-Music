import type { MusicGenerationStatus } from "./music-status.js";
import type { MusicProviderId } from "./music-provider-id.js";

export interface GenerateSongInput {
  prompt: string;
  style?: string;
  title?: string;
  instrumental?: boolean;
  /** When false, provider may auto-generate lyrics from prompt (Suno non-custom mode). */
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

export interface GetLyricsInput {
  prompt: string;
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

export interface GetLyricsResult {
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
