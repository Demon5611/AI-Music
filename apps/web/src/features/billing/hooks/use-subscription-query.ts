"use client";

import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/shared/providers/api-provider";

export function useSubscriptionQuery() {
  const api = useApi();

  return useQuery({
    queryKey: ["billing", "subscription"],
    queryFn: () => api.billing.getSubscription(),
  });
}
