export const MUSIC_PROVIDER_IDS = [
  "sunoapi",
  "elevenlabs",
  "official-suno",
  "udio",
] as const;

export type MusicProviderId = (typeof MUSIC_PROVIDER_IDS)[number];

export function isMusicProviderId(value: string): value is MusicProviderId {
  return (MUSIC_PROVIDER_IDS as readonly string[]).includes(value);
}

export function resolveMusicProviderId(
  env: NodeJS.ProcessEnv = process.env,
): MusicProviderId {
  const raw = env.MUSIC_PROVIDER ?? "sunoapi";

  if (!isMusicProviderId(raw)) {
    throw new Error(`Unsupported music provider: ${raw}`);
  }

  return raw;
}
