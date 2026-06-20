import type {
  CreateCheckoutSessionInput,
  SubscriptionDto,
} from "@ai-music/shared";
import type { ApiClient } from "./client.js";

export function createBillingApi(client: ApiClient) {
  return {
    getSubscription: () => client.get<SubscriptionDto>("/api/billing/subscription"),
    createCheckoutSession: (input: CreateCheckoutSessionInput) =>
      client.post<{ url: string }>("/api/billing/create-checkout-session", input),
    createPortalSession: () =>
      client.post<{ url: string }>("/api/billing/create-portal-session", {}),
  };
}
