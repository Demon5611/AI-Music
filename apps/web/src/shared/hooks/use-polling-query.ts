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
  resolveIntervalMs?: (data: TData | undefined) => number;
}

export function usePollingQuery<TData>({
  queryKey,
  queryFn,
  enabled = true,
  isTerminal,
  intervalMs,
  resolveIntervalMs,
}: UsePollingQueryOptions<TData>): UseQueryResult<TData> {
  return useQuery({
    queryKey,
    queryFn,
    enabled,
    refetchInterval: (query) => {
      if (query.state.status === "error") {
        return false;
      }

      if (isTerminal(query.state.data)) {
        return false;
      }

      return resolveIntervalMs?.(query.state.data) ?? intervalMs;
    },
  } satisfies UseQueryOptions<TData>);
}
