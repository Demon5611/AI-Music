import type { MusicProvider } from "../domain/music-provider.interface.js";
import type { MusicProviderId } from "../domain/music-provider-id.js";
import type {
  ExtendSongInput,
  ExtendSongResult,
  GenerateSongInput,
  GenerateSongResult,
  GenerationStatusResult,
  GetLyricsInput,
  GetLyricsResult,
} from "../domain/music.types.js";
import { NotImplementedMusicProviderError } from "../domain/not-implemented.error.js";

export abstract class StubMusicProvider implements MusicProvider {
  abstract readonly id: MusicProviderId;

  generateSong(input: GenerateSongInput): Promise<GenerateSongResult> {
    void input;
    return this.reject("generateSong");
  }

  extendSong(input: ExtendSongInput): Promise<ExtendSongResult> {
    void input;
    return this.reject("extendSong");
  }

  getLyrics(input: GetLyricsInput): Promise<GetLyricsResult> {
    void input;
    return this.reject("getLyrics");
  }

  getGenerationStatus(taskId: string): Promise<GenerationStatusResult> {
    void taskId;
    return this.reject("getGenerationStatus");
  }

  private reject(method: string): Promise<never> {
    return Promise.reject(new NotImplementedMusicProviderError(this.id, method));
  }
}
