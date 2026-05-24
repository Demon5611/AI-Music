import type { VoiceSample } from "@ai-music/shared";
import type { ApiClient } from "./client.js";

export function createVoiceSamplesApi(client: ApiClient) {
  return {
    list: () => client.get<VoiceSample[]>("/api/voice-samples"),
    create: (formData: FormData) =>
      client.postForm<VoiceSample>("/api/voice-samples", formData),
    remove: (id: string) =>
      client.delete<void>(`/api/voice-samples/${id}`),
  };
}
