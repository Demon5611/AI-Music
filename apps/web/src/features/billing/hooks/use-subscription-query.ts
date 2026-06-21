"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthReady } from "@/shared/hooks/use-auth-ready";
import { useApi } from "@/shared/providers/api-provider";

export function useSubscriptionQuery() {
  const api = useApi();
  const authReady = useAuthReady();

  return useQuery({
    queryKey: ["billing", "subscription"],
    queryFn: () => api.billing.getSubscription(),
    enabled: authReady,
  });
}
