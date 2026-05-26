import type {
  KitsVoiceModel,
  KitsVoiceModelsResponse,
} from "@ai-music/shared";
import type { ApiClient } from "./client.js";

export interface ListKitsVoiceModelsParams {
  myModels?: boolean;
  page?: number;
  perPage?: number;
}

function buildVoiceModelsQuery(params: ListKitsVoiceModelsParams): string {
  const search = new URLSearchParams();

  if (params.myModels) {
    search.set("myModels", "true");
  }

  if (params.page) {
    search.set("page", String(params.page));
  }

  if (params.perPage) {
    search.set("perPage", String(params.perPage));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export function createKitsApi(client: ApiClient) {
  return {
    listVoiceModels: (params: ListKitsVoiceModelsParams = {}) =>
      client.get<KitsVoiceModelsResponse>(
        `/api/kits/voice-models${buildVoiceModelsQuery(params)}`,
      ),
    getVoiceModel: (id: number) =>
      client.get<KitsVoiceModel>(`/api/kits/voice-models/${id}`),
  };
}
