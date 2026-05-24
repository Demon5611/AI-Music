import type { Track } from "@ai-music/shared";

export type { Track };

export function formatTrackTitle(track: Track): string {
  return track.title.trim() || "Untitled track";
}
