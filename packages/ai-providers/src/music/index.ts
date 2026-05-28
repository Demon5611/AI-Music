export type { MusicProvider } from "./domain/music-provider.interface.js";
export {
  MUSIC_PROVIDER_IDS,
  type MusicProviderId,
  isMusicProviderId,
  resolveMusicProviderId,
} from "./domain/music-provider-id.js";
export {
  MUSIC_GENERATION_STATUSES,
  type MusicGenerationStatus,
  isMusicGenerationStatus,
} from "./domain/music-status.js";
export type {
  ExtendSongInput,
  ExtendSongResult,
  GenerateSongInput,
  GenerateSongResult,
  GeneratedLyrics,
  GeneratedTrack,
  GenerationStatusResult,
  GetLyricsInput,
  GetLyricsResult,
} from "./domain/music.types.js";
export {
  MusicProviderError,
  MusicRateLimitError,
  MusicInsufficientCreditsError,
  MusicGenerationFailedError,
  MusicInvalidPromptError,
  MusicProviderUnavailableError,
  MusicTimeoutError,
} from "./domain/errors/index.js";
export { NotImplementedMusicProviderError } from "./domain/not-implemented.error.js";
export {
  SunoApiProvider,
  createSunoApiProvider,
} from "./providers/suno-api/suno-api.provider.js";
export { SunoApiClient, toSunoModelId } from "./providers/suno-api/suno-api.client.js";
export { createSunoApiClient } from "./providers/suno-api/create-suno-api-client.js";
export type {
  SunoApiClientConfig,
} from "./providers/suno-api/suno-api.client.js";
export type {
  SunoMusicTaskRaw,
  SunoLyricsTaskRaw,
  SunoModelId,
} from "./providers/suno-api/suno-api.types.js";
export { ElevenLabsMusicProviderAdapter } from "./providers/elevenlabs/elevenlabs-music.provider.js";
export { OfficialSunoProvider } from "./providers/official-suno/official-suno.provider.js";
export { UdioProvider } from "./providers/udio/udio.provider.js";
export {
  MusicProviderFactory,
  createMusicProviderFactory,
  type MusicProviderRegistry,
} from "./music-provider.factory.js";
export { MusicService, createMusicService } from "./music.service.js";
export { pollMusicUntilComplete, type PollMusicOptions } from "./poll-music.js";
export {
  resolveMusicProviderConfig,
  type MusicProviderConfig,
} from "./music-config.js";
export type {
  AddInstrumentalInput,
  AddVocalsInput,
  AudioResult,
  SeparateStemsInput,
  StemResult,
} from "./domain/music.types.js";
export type {
  VoiceTransferInput,
  VoiceTransferProvider,
  VoiceTransferResult,
} from "../voice-transfer/voice-transfer.types.js";
export {
  KitsVoiceTransferProvider,
  createKitsVoiceTransferProvider,
} from "../voice-transfer/kits-voice-transfer.provider.js";
