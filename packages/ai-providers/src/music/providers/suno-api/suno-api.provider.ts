import type { MusicProvider } from "../../domain/music-provider.interface.js";
import { MusicProviderError } from "../../domain/errors/music-provider.error.js";
import type {
  ExtendSongInput,
  ExtendSongResult,
  GenerateSongInput,
  GenerateSongResult,
  GenerationStatusResult,
  GetLyricsInput,
  GetLyricsResult,
} from "../../domain/music.types.js";
import {
  resolveMusicProviderConfig,
  type MusicProviderConfig,
} from "../../music-config.js";
import { createSunoApiClient } from "./create-suno-api-client.js";
import {
  mapSunoLyricsTaskToStatus,
  mapSunoMusicTaskToStatus,
} from "./suno-api.mapper.js";
import { SunoApiClient, toSunoModelId } from "./suno-api.client.js";
import type {
  SunoExtendMusicRequest,
  SunoGenerateMusicRequest,
  SunoUploadCoverRequest,
} from "./suno-api.types.js";

const PROVIDER_ID = "sunoapi" as const;

export class SunoApiProvider implements MusicProvider {
  readonly id = PROVIDER_ID;

  private clientInstance: SunoApiClient | null;

  constructor(
    client?: SunoApiClient,
    private readonly config: MusicProviderConfig = resolveMusicProviderConfig(),
  ) {
    this.clientInstance = client ?? null;
  }

  async generateSong(input: GenerateSongInput): Promise<GenerateSongResult> {
    const client = this.getClient();
    const taskId = input.referenceAudioUrl
      ? await client.uploadAndCover(this.buildUploadCoverRequest(input))
      : await client.generateMusic(this.buildGenerateRequest(input));

    return {
      provider: PROVIDER_ID,
      taskId,
      status: "pending",
    };
  }

  async extendSong(input: ExtendSongInput): Promise<ExtendSongResult> {
    const body: SunoExtendMusicRequest = {
      audioId: input.audioId,
      defaultParamFlag: true,
      prompt: input.prompt,
      style: input.style ?? "Pop",
      title: input.title ?? "Extended Track",
      continueAt: input.continueAtSec,
      model: toSunoModelId(this.config.sunoModel),
      callBackUrl: this.config.sunoCallbackUrl,
    };

    const taskId = await this.getClient().extendMusic(body);

    return {
      provider: PROVIDER_ID,
      taskId,
      status: "pending",
    };
  }

  async getLyrics(input: GetLyricsInput): Promise<GetLyricsResult> {
    const taskId = await this.getClient().generateLyrics({
      prompt: input.prompt,
      callBackUrl: this.config.sunoCallbackUrl,
    });

    return {
      provider: PROVIDER_ID,
      taskId,
      status: "pending",
    };
  }

  async getGenerationStatus(taskId: string): Promise<GenerationStatusResult> {
    const client = this.getClient();

    try {
      const musicTask = await client.getMusicGenerationDetails(taskId);
      return mapSunoMusicTaskToStatus(musicTask);
    } catch (musicError) {
      if (!shouldFallbackToLyricsLookup(musicError)) {
        throw musicError;
      }
    }

    const lyricsTask = await client.getLyricsGenerationDetails(taskId);
    return mapSunoLyricsTaskToStatus(lyricsTask);
  }

  private getClient(): SunoApiClient {
    this.clientInstance ??= createSunoApiClient({
      sunoApiBaseUrl: this.config.sunoApiBaseUrl,
      sunoApiKey: this.config.sunoApiKey,
      requestTimeoutMs: this.config.requestTimeoutMs,
    });

    return this.clientInstance;
  }

  private buildGenerateRequest(input: GenerateSongInput): SunoGenerateMusicRequest {
    const customMode = this.resolveCustomMode(input);
    const instrumental = input.instrumental ?? false;

    if (customMode) {
      return {
        customMode: true,
        instrumental,
        prompt: instrumental ? undefined : input.prompt,
        style: input.style ?? "Pop",
        title: input.title ?? "Untitled",
        model: toSunoModelId(this.config.sunoModel),
        callBackUrl: this.config.sunoCallbackUrl,
      };
    }

    return {
      customMode: false,
      instrumental,
      prompt: input.prompt,
      model: toSunoModelId(this.config.sunoModel),
      callBackUrl: this.config.sunoCallbackUrl,
    };
  }

  private buildUploadCoverRequest(
    input: GenerateSongInput,
  ): SunoUploadCoverRequest {
    const base = this.buildGenerateRequest(input);

    if (!input.referenceAudioUrl) {
      throw new Error("referenceAudioUrl is required for upload-cover");
    }

    return {
      ...base,
      uploadUrl: input.referenceAudioUrl,
    };
  }

  private resolveCustomMode(input: GenerateSongInput): boolean {
    if (input.customMode === false) {
      return false;
    }

    if (input.customMode === true) {
      return true;
    }

    return Boolean(input.style && input.title);
  }
}

export function createSunoApiProvider(
  client?: SunoApiClient,
  config?: MusicProviderConfig,
): SunoApiProvider {
  return new SunoApiProvider(client, config ?? resolveMusicProviderConfig());
}

const NON_LYRICS_LOOKUP_CODES = new Set([
  "SUNO_UNAUTHORIZED",
  "SUNO_API_KEY_MISSING",
  "MUSIC_INSUFFICIENT_CREDITS",
  "MUSIC_RATE_LIMIT",
  "MUSIC_TIMEOUT",
  "MUSIC_PROVIDER_UNAVAILABLE",
]);

function shouldFallbackToLyricsLookup(error: unknown): boolean {
  if (!(error instanceof MusicProviderError)) {
    return true;
  }

  return !NON_LYRICS_LOOKUP_CODES.has(error.code);
}
