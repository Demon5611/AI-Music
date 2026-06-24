import type {
  AlbumCoverStatusResult,
  ExtendSongInput,
  ExtendSongResult,
  GenerateLyricsInput,
  GenerateLyricsResult,
  GenerateSongInput,
  GenerateSongResult,
  GenerationStatusResult,
  SeparateStemsInput,
  StemResult,
  TimestampedLyricsInput,
  TimestampedLyricsResult,
} from "./domain/music.types.js";
import { createMusicProviderFactory, type MusicProviderFactory } from "./music-provider.factory.js";

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

  generateLyrics(input: GenerateLyricsInput): Promise<GenerateLyricsResult> {
    const provider = this.providerFactory.getProvider();

    if (!provider.generateLyrics) {
      throw new Error("Active music provider does not support lyrics generation");
    }

    return provider.generateLyrics(input);
  }

  getLyricsGenerationStatus(taskId: string): Promise<GenerationStatusResult> {
    const provider = this.providerFactory.getProvider();

    if (!provider.getLyricsGenerationStatus) {
      throw new Error("Active music provider does not support lyrics status");
    }

    return provider.getLyricsGenerationStatus(taskId);
  }

  extendSong(input: ExtendSongInput): Promise<ExtendSongResult> {
    const provider = this.providerFactory.getProvider();
    return provider.extendSong(input);
  }

  getGenerationStatus(taskId: string): Promise<GenerationStatusResult> {
    const provider = this.providerFactory.getProvider();
    return provider.getGenerationStatus(taskId);
  }

  separateStems(input: SeparateStemsInput): Promise<StemResult> {
    const provider = this.providerFactory.getProvider();

    if (!provider.separateStems) {
      throw new Error("Active music provider does not support stem separation");
    }

    return provider.separateStems(input);
  }

  getStemSeparationStatus(taskId: string): Promise<StemResult> {
    const provider = this.providerFactory.getProvider();

    if (!provider.getStemSeparationStatus) {
      throw new Error("Active music provider does not support stem separation status");
    }

    return provider.getStemSeparationStatus(taskId);
  }

  getTimestampedLyrics(input: TimestampedLyricsInput): Promise<TimestampedLyricsResult> {
    const provider = this.providerFactory.getProvider();

    if (!provider.getTimestampedLyrics) {
      throw new Error("Active music provider does not support timestamped lyrics");
    }

    return provider.getTimestampedLyrics(input);
  }

  generateAlbumCover(providerTaskId: string): Promise<{ taskId: string }> {
    const provider = this.providerFactory.getProvider();

    if (!provider.generateAlbumCover) {
      throw new Error("Active music provider does not support album cover generation");
    }

    return provider.generateAlbumCover(providerTaskId);
  }

  getAlbumCoverStatus(taskId: string): Promise<AlbumCoverStatusResult> {
    const provider = this.providerFactory.getProvider();

    if (!provider.getAlbumCoverStatus) {
      throw new Error("Active music provider does not support album cover status");
    }

    return provider.getAlbumCoverStatus(taskId);
  }
}

export function createMusicService(providerFactory?: MusicProviderFactory): MusicService {
  return new MusicService(providerFactory);
}
