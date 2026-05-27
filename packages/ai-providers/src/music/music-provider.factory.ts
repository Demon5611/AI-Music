import type { MusicProviderId } from "./domain/music-provider-id.js";
import { resolveMusicProviderId } from "./domain/music-provider-id.js";
import type { MusicProvider } from "./domain/music-provider.interface.js";
import { MusicProviderError } from "./domain/errors/music-provider.error.js";
import { ElevenLabsMusicProviderAdapter } from "./providers/elevenlabs/elevenlabs-music.provider.js";
import { OfficialSunoProvider } from "./providers/official-suno/official-suno.provider.js";
import { createSunoApiProvider } from "./providers/suno-api/suno-api.provider.js";
import { UdioProvider } from "./providers/udio/udio.provider.js";

export type MusicProviderRegistry = Partial<
  Record<MusicProviderId, MusicProvider>
>;

/**
 * Selects a music vendor by MUSIC_PROVIDER env. Business code must depend on
 * MusicProvider interface only — never on Suno/ElevenLabs HTTP details.
 */
export class MusicProviderFactory {
  private readonly registry: Map<MusicProviderId, MusicProvider>;

  constructor(overrides: MusicProviderRegistry = {}) {
    this.registry = new Map<MusicProviderId, MusicProvider>([
      ["sunoapi", overrides.sunoapi ?? createSunoApiProvider()],
      [
        "elevenlabs",
        overrides.elevenlabs ?? new ElevenLabsMusicProviderAdapter(),
      ],
      ["official-suno", overrides["official-suno"] ?? new OfficialSunoProvider()],
      ["udio", overrides.udio ?? new UdioProvider()],
    ]);
  }

  getProvider(providerId?: MusicProviderId): MusicProvider {
    const id = providerId ?? resolveMusicProviderId();
    const provider = this.registry.get(id);

    if (!provider) {
      throw new MusicProviderError(
        `Unsupported music provider: ${id}`,
        "UNSUPPORTED_MUSIC_PROVIDER",
        id,
        500,
      );
    }

    return provider;
  }
}

export function createMusicProviderFactory(
  overrides?: MusicProviderRegistry,
): MusicProviderFactory {
  return new MusicProviderFactory(overrides);
}
