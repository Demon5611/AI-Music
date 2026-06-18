"use client";

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";

interface UsePollingQueryOptions<TData> {
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
  enabled?: boolean;
  isTerminal: (data: TData | undefined) => boolean;
  intervalMs: number;
}

export function usePollingQuery<TData>({
  queryKey,
  queryFn,
  enabled = true,
  isTerminal,
  intervalMs,
}: UsePollingQueryOptions<TData>): UseQueryResult<TData> {
  return useQuery({
    queryKey,
    queryFn,
    enabled,
    refetchInterval: (query) => {
      if (isTerminal(query.state.data)) {
        return false;
      }

      return intervalMs;
    },
  } satisfies UseQueryOptions<TData>);
}
