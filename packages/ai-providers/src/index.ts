import type {
  ConvertVoiceInput,
  ConvertedVoiceResult,
  GenerateSongInput,
  GeneratedSongResult,
  MusicGenerationProvider,
  VoiceConversionProvider,
} from "./types.js";
import { createKitsClient } from "./kits/create-kits-client.js";
import type { CreateKitsVoiceConversionInput } from "./kits/types.js";
import { KitsClient } from "./kits/kits-client.js";

export class ElevenLabsMusicProvider implements MusicGenerationProvider {
  async generateSong(input: GenerateSongInput): Promise<GeneratedSongResult> {
    void input;
    throw new Error("ElevenLabsMusicProvider: not implemented");
  }
}

export class KitsVoiceConversionProvider implements VoiceConversionProvider {
  constructor(private readonly client: KitsClient = createKitsClient()) {}

  async convertVoice(input: ConvertVoiceInput): Promise<ConvertedVoiceResult> {
    void input;
    throw new Error(
      "KitsVoiceConversionProvider.convertVoice: use KitsClient for file-based flow",
    );
  }

  createJob(input: CreateKitsVoiceConversionInput) {
    return this.client.createVoiceConversion(input);
  }

  getJob(id: number) {
    return this.client.getVoiceConversion(id);
  }
}

export { KitsClient, createKitsClient };
export { KitsApiError } from "./kits/kits-api-error.js";
export type { CreateKitsVoiceConversionInput, KitsInferenceJob } from "./kits/types.js";
export * from "./types.js";
