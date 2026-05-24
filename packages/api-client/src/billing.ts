import type {
  CreateCheckoutSessionInput,
  CreditsBalance,
} from "@ai-music/shared";
import type { ApiClient } from "./client.js";

export function createBillingApi(client: ApiClient) {
  return {
    getBalance: () => client.get<CreditsBalance>("/api/credits/balance"),
    createCheckoutSession: (input: CreateCheckoutSessionInput) =>
      client.post<{ url: string }>(
        "/api/billing/create-checkout-session",
        input,
      ),
  };
}
