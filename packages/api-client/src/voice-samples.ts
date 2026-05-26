import type { LinkKitsVoiceModelInput, VoiceSample } from "@ai-music/shared";
import type { ApiClient } from "./client.js";

export function createVoiceSamplesApi(client: ApiClient) {
  return {
    list: () => client.get<VoiceSample[]>("/api/voice-samples"),
    create: (formData: FormData) =>
      client.postForm<VoiceSample>("/api/voice-samples", formData),
    linkKitsModel: (id: string, input: LinkKitsVoiceModelInput) =>
      client.patch<VoiceSample>(`/api/voice-samples/${id}`, input),
    remove: (id: string) =>
      client.delete<void>(`/api/voice-samples/${id}`),
  };
}
