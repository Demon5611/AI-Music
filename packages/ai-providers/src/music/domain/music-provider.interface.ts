import type { MusicProviderId } from "./music-provider-id.js";
import type {
  AddInstrumentalInput,
  AddVocalsInput,
  AudioResult,
  ExtendSongInput,
  ExtendSongResult,
  GenerateLyricsInput,
  GenerateLyricsResult,
  GenerateSongInput,
  GenerateSongResult,
  GenerationStatusResult,
  SeparateStemsInput,
  StemResult,
} from "./music.types.js";

/**
 * Music generation contract shared by Suno, ElevenLabs Music, Udio, etc.
 *
 * Abstraction layer keeps API/worker/UI independent from a single vendor so we
 * can switch providers via MUSIC_PROVIDER without rewriting business logic.
 *
 * Voice transfer (Kits, ElevenLabs IVC) is intentionally out of scope — see
 * VoiceTransferProvider in the voice-transfer module.
 */
export interface MusicProvider {
  readonly id: MusicProviderId;

  generateSong(input: GenerateSongInput): Promise<GenerateSongResult>;

  generateLyrics?(input: GenerateLyricsInput): Promise<GenerateLyricsResult>;

  getLyricsGenerationStatus?(taskId: string): Promise<GenerationStatusResult>;

  extendSong(input: ExtendSongInput): Promise<ExtendSongResult>;

  getGenerationStatus(taskId: string): Promise<GenerationStatusResult>;

  separateStems?(input: SeparateStemsInput): Promise<StemResult>;

  getStemSeparationStatus?(taskId: string): Promise<StemResult>;

  addVocals?(input: AddVocalsInput): Promise<AudioResult>;

  addInstrumental?(input: AddInstrumentalInput): Promise<AudioResult>;
}
