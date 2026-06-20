export type MusicGenerationType = "song" | "lyrics";

export type MusicGenerationRecordStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export interface MusicGenerationTrackDto {
  id: string;
  providerTrackId: string;
  title: string;
  durationSec: number | null;
  audioUrl: string | null;
  imageUrl: string | null;
  lyricsText: string | null;
}

export interface MusicGenerationRecordDto {
  id: string;
  type: MusicGenerationType;
  providerTaskId: string;
  prompt: string;
  style: string | null;
  title: string | null;
  customMode: boolean;
  instrumental: boolean;
  status: MusicGenerationRecordStatus;
  rawStatus: string | null;
  errorMessage: string | null;
  lyrics: Array<{ title: string; text: string }> | null;
  tracks: MusicGenerationTrackDto[];
  createdAt: string;
  updatedAt: string;
}

export interface MusicGenerateResponseDto {
  recordId: string;
  provider: string;
  taskId: string;
  status: string;
}

export interface MusicLyricsGenerateResponseDto {
  provider: string;
  taskId: string;
  status: MusicGenerationRecordStatus;
  lyricsDurationSec?: number;
}

export interface MusicLyricsStatusResponseDto {
  taskId: string;
  status: MusicGenerationRecordStatus;
  provider: string;
  rawStatus?: string;
  lyrics?: Array<{ title: string; text: string }>;
  errorMessage?: string;
  lyricsDurationSec?: number;
}

export interface MusicStatusResponseDto {
  recordId: string | null;
  taskId: string;
  status: MusicGenerationRecordStatus;
  provider: string;
  rawStatus?: string;
  tracks?: Array<{
    id: string;
    providerTrackId?: string;
    canDelete?: boolean;
    title: string;
    audioUrl: string;
    imageUrl?: string;
    durationSec?: number;
    lyricsText?: string;
  }>;
  lyrics?: Array<{ title: string; text: string }>;
  errorMessage?: string;
}
