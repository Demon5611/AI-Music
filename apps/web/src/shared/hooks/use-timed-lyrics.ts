"use client";

import { ApiError } from "@ai-music/api-client";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/shared/providers/api-provider";
import { useInvalidateCreditsBalance } from "@/features/billing/hooks/invalidate-credits-balance";

export const timedLyricsQueryKey = (trackId: string) => ["timed-lyrics", trackId] as const;

export function useTimedLyrics(trackId: string | undefined, karaokeEnabled: boolean) {
  const api = useApi();
  const invalidateCreditsBalance = useInvalidateCreditsBalance();

  return useQuery({
    queryKey: trackId ? timedLyricsQueryKey(trackId) : ["timed-lyrics", "missing"],
    enabled: Boolean(trackId && karaokeEnabled),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
    queryFn: async () => {
      if (!trackId) {
        throw new Error("Track id is required");
      }

      try {
        return await api.music.getTimedLyrics(trackId);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          const fetched = await api.music.fetchTimedLyrics(trackId);
          await invalidateCreditsBalance();
          return fetched;
        }

        throw error;
      }
    },
  });
}
