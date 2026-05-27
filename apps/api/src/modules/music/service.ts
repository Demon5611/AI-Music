import {
  createMusicService,
  resolveMusicProviderConfig,
  resolveMusicProviderId,
} from "@ai-music/ai-providers";
import type { GenerateSongInput } from "@ai-music/ai-providers";

const musicService = createMusicService();

export function getMusicTestStatus() {
  const config = resolveMusicProviderConfig();

  return {
    provider: resolveMusicProviderId(),
    configured: Boolean(config.sunoApiKey.trim()),
  };
}

export function generateMusic(input: GenerateSongInput) {
  return musicService.generateSong(input);
}

export function getMusicGenerationStatus(taskId: string) {
  return musicService.getGenerationStatus(taskId);
}

export function generateLyrics(prompt: string) {
  return musicService.getLyrics({ prompt });
}

export function extendMusic(input: {
  audioId: string;
  prompt: string;
  continueAtSec: number;
  style?: string;
  title?: string;
}) {
  return musicService.extendSong(input);
}
