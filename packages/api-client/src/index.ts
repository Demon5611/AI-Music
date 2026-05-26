export { ApiError, createApiClient } from "./client.js";
export type { ApiClient, ApiClientOptions } from "./client.js";
export { createKitsApi } from "./kits.js";
export { createVoiceSamplesApi } from "./voice-samples.js";
export { createGenerationsApi } from "./generations.js";
export { createTracksApi } from "./tracks.js";
export { createBillingApi } from "./billing.js";
export { createUsersApi } from "./users.js";
export { createCreditsApi } from "./credits.js";

import type { ApiClientOptions } from "./client.js";
import { createApiClient } from "./client.js";
import { createBillingApi } from "./billing.js";
import { createCreditsApi } from "./credits.js";
import { createGenerationsApi } from "./generations.js";
import { createTracksApi } from "./tracks.js";
import { createUsersApi } from "./users.js";
import { createKitsApi } from "./kits.js";
import { createVoiceSamplesApi } from "./voice-samples.js";

export function createApi(options: ApiClientOptions) {
  const client = createApiClient(options);

  return {
    voiceSamples: createVoiceSamplesApi(client),
    kits: createKitsApi(client),
    generations: createGenerationsApi(client),
    tracks: createTracksApi(client),
    billing: createBillingApi(client),
    users: createUsersApi(client),
    credits: createCreditsApi(client),
  };
}

export type Api = ReturnType<typeof createApi>;
