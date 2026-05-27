import type { MusicProviderId } from "./music-provider-id.js";
import type {
  ExtendSongInput,
  ExtendSongResult,
  GenerateSongInput,
  GenerateSongResult,
  GenerationStatusResult,
  GetLyricsInput,
  GetLyricsResult,
} from "./music.types.js";

/**
 * Music generation contract shared by Suno, ElevenLabs Music, Udio, etc.
 *
 * Abstraction layer keeps API/worker/UI independent from a single vendor so we
 * can switch providers via MUSIC_PROVIDER without rewriting business logic.
 *
 * Voice transfer (Kits, ElevenLabs IVC) is intentionally out of scope — see
 * VoiceConversionProvider in the root types module.
 */
export interface MusicProvider {
  readonly id: MusicProviderId;

  generateSong(input: GenerateSongInput): Promise<GenerateSongResult>;

  extendSong(input: ExtendSongInput): Promise<ExtendSongResult>;

  getLyrics(input: GetLyricsInput): Promise<GetLyricsResult>;

  getGenerationStatus(taskId: string): Promise<GenerationStatusResult>;
}
