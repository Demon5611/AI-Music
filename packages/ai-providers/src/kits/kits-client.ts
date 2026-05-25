import type {
  CreateKitsVoiceConversionInput,
  KitsInferenceJob,
} from "./types.js";
import { throwKitsApiError } from "./kits-api-error.js";

export class KitsClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  async createVoiceConversion(
    input: CreateKitsVoiceConversionInput,
  ): Promise<KitsInferenceJob> {
    const form = new FormData();
    form.append("voiceModelId", String(input.voiceModelId));

    const bytes = Uint8Array.from(input.soundFile);
    const blob = new Blob([bytes], {
      type: input.mimeType ?? "audio/mpeg",
    });
    form.append("soundFile", blob, input.filename);

    const response = await fetch(`${this.baseUrl}/voice-conversions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
    });

    if (!response.ok) {
      await throwKitsApiError(response, "Kits createVoiceConversion");
    }

    return response.json() as Promise<KitsInferenceJob>;
  }

  async getVoiceConversion(id: number): Promise<KitsInferenceJob> {
    const response = await fetch(`${this.baseUrl}/voice-conversions/${id}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    if (!response.ok) {
      await throwKitsApiError(response, "Kits getVoiceConversion");
    }

    return response.json() as Promise<KitsInferenceJob>;
  }
}
