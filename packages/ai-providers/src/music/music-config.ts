import type { MusicProviderId } from "./domain/music-provider-id.js";
import { resolveMusicProviderId } from "./domain/music-provider-id.js";

export interface MusicProviderConfig {
  providerId: MusicProviderId;
  /**
   * Required by Suno async API; polling remains the primary completion path.
   * Webhook route can be added later without changing MusicService.
   */
  sunoCallbackUrl: string;
  sunoApiBaseUrl: string;
  sunoApiKey: string;
  sunoModel: string;
  requestTimeoutMs: number;
  pollIntervalMs: number;
  pollTimeoutMs: number;
}

export function resolveMusicProviderConfig(
  env: NodeJS.ProcessEnv = process.env,
): MusicProviderConfig {
  return {
    providerId: resolveMusicProviderId(env),
    sunoCallbackUrl:
      env.SUNO_CALLBACK_URL ??
      "http://localhost:3001/api/music/callback/suno",
    sunoApiBaseUrl: env.SUNO_API_BASE_URL ?? "https://api.sunoapi.org",
    sunoApiKey: env.SUNO_API_KEY ?? "",
    sunoModel: env.SUNO_API_MODEL ?? "V4_5ALL",
    requestTimeoutMs: Number(env.SUNO_REQUEST_TIMEOUT_MS ?? 30_000),
    pollIntervalMs: Number(env.SUNO_POLL_INTERVAL_MS ?? 5_000),
    pollTimeoutMs: Number(env.SUNO_POLL_TIMEOUT_MS ?? 600_000),
  };
}
