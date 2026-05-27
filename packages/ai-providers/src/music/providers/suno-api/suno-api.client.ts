import { MusicProviderUnavailableError } from "../../domain/errors/music-provider-unavailable.error.js";
import {
  assertSunoApiKey,
  isRetryableNetworkError,
  mapSunoApiCodeToError,
  parseSunoEnvelope,
  toMusicTimeoutError,
} from "./suno-api.errors.js";
import type {
  SunoApiEnvelope,
  SunoExtendMusicRequest,
  SunoGenerateLyricsRequest,
  SunoGenerateMusicRequest,
  SunoLyricsTaskRaw,
  SunoModelId,
  SunoMusicTaskRaw,
  SunoTaskIdData,
  SunoUploadCoverRequest,
} from "./suno-api.types.js";

const API_PREFIX = "/api/v1";
const DEFAULT_RETRIES = 2;

export interface SunoApiClientConfig {
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
  retries?: number;
}

export class SunoApiClient {
  private readonly retries: number;

  constructor(private readonly config: SunoApiClientConfig) {
    assertSunoApiKey(config.apiKey);
    this.retries = config.retries ?? DEFAULT_RETRIES;
  }

  generateMusic(body: SunoGenerateMusicRequest): Promise<string> {
    return this.createTask("/generate", body);
  }

  uploadAndCover(body: SunoUploadCoverRequest): Promise<string> {
    return this.createTask("/generate/upload-cover", body);
  }

  extendMusic(body: SunoExtendMusicRequest): Promise<string> {
    return this.createTask("/generate/extend", body);
  }

  generateLyrics(body: SunoGenerateLyricsRequest): Promise<string> {
    return this.createTask("/lyrics", body);
  }

  getMusicGenerationDetails(taskId: string): Promise<SunoMusicTaskRaw> {
    return this.fetchTask(`/generate/record-info?taskId=${encodeURIComponent(taskId)}`);
  }

  getLyricsGenerationDetails(taskId: string): Promise<SunoLyricsTaskRaw> {
    return this.fetchTask(`/lyrics/record-info?taskId=${encodeURIComponent(taskId)}`);
  }

  getRemainingCredits(): Promise<number> {
    return this.request<number>("/get-credits", { method: "GET" });
  }

  private async createTask(path: string, body: unknown): Promise<string> {
    const data = await this.request<SunoTaskIdData>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!data.taskId) {
      throw mapSunoApiCodeToError(500, "Suno API did not return taskId");
    }

    return data.taskId;
  }

  private async fetchTask<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "GET" });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const url = `${this.config.baseUrl.replace(/\/$/, "")}${API_PREFIX}${path}`;

    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      try {
        const response = await this.fetchWithTimeout(url, init);
        const envelope = await parseSunoEnvelope<T>(response);
        return envelope.data;
      } catch (error) {
        if (!this.shouldRetry(error, attempt)) {
          throw error;
        }
      }
    }

    throw toMusicTimeoutError();
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
          ...init.headers,
        },
      });

      if (!response.ok && response.status >= 500) {
        const body = await response.text();
        let code = response.status;

        try {
          const parsed = JSON.parse(body) as SunoApiEnvelope<unknown>;
          code = parsed.code ?? response.status;
        } catch {
          // Non-JSON 5xx body.
        }

        throw mapSunoApiCodeToError(code, `Suno API HTTP ${response.status}`);
      }

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw toMusicTimeoutError();
      }

      if (isRetryableNetworkError(error)) {
        throw error;
      }

      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  private shouldRetry(error: unknown, attempt: number): boolean {
    if (attempt >= this.retries) {
      return false;
    }

    if (isRetryableNetworkError(error)) {
      return true;
    }

    if (error instanceof MusicProviderUnavailableError) {
      return true;
    }

    return false;
  }
}

export function toSunoModelId(model: string): SunoModelId {
  const allowed: SunoModelId[] = [
    "V4",
    "V4_5",
    "V4_5PLUS",
    "V4_5ALL",
    "V5",
    "V5_5",
  ];

  if ((allowed as readonly string[]).includes(model)) {
    return model as SunoModelId;
  }

  return "V4_5ALL";
}
