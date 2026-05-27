import type {
  ExtendSongInput,
  ExtendSongResult,
  GenerateSongInput,
  GenerateSongResult,
  GenerationStatusResult,
  GetLyricsInput,
  GetLyricsResult,
} from "./domain/music.types.js";
import {
  createMusicProviderFactory,
  type MusicProviderFactory,
} from "./music-provider.factory.js";

/**
 * Application-facing music orchestration. Routes all generation to the active
 * MusicProvider so API and worker stay vendor-agnostic.
 */
export class MusicService {
  constructor(
    private readonly providerFactory: MusicProviderFactory = createMusicProviderFactory(),
  ) {}

  generateSong(input: GenerateSongInput): Promise<GenerateSongResult> {
    const provider = this.providerFactory.getProvider();
    return provider.generateSong(input);
  }

  extendSong(input: ExtendSongInput): Promise<ExtendSongResult> {
    const provider = this.providerFactory.getProvider();
    return provider.extendSong(input);
  }

  getLyrics(input: GetLyricsInput): Promise<GetLyricsResult> {
    const provider = this.providerFactory.getProvider();
    return provider.getLyrics(input);
  }

  getGenerationStatus(taskId: string): Promise<GenerationStatusResult> {
    const provider = this.providerFactory.getProvider();
    return provider.getGenerationStatus(taskId);
  }
}

export function createMusicService(
  providerFactory?: MusicProviderFactory,
): MusicService {
  return new MusicService(providerFactory);
}
