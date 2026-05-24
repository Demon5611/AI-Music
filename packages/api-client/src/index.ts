export { ApiError, createApiClient } from "./client.js";
export type { ApiClient, ApiClientOptions } from "./client.js";
export { createVoiceSamplesApi } from "./voice-samples.js";
export { createGenerationsApi } from "./generations.js";
export { createTracksApi } from "./tracks.js";
export { createBillingApi } from "./billing.js";

import type { ApiClientOptions } from "./client.js";
import { createApiClient } from "./client.js";
import { createBillingApi } from "./billing.js";
import { createGenerationsApi } from "./generations.js";
import { createTracksApi } from "./tracks.js";
import { createVoiceSamplesApi } from "./voice-samples.js";

export function createApi(options: ApiClientOptions) {
  const client = createApiClient(options);

  return {
    voiceSamples: createVoiceSamplesApi(client),
    generations: createGenerationsApi(client),
    tracks: createTracksApi(client),
    billing: createBillingApi(client),
  };
}
