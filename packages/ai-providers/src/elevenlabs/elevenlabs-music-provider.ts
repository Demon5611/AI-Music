import type {
  GenerateSongInput,
  GeneratedSongResult,
  MusicGenerationProvider,
} from "../types.js";
import { createElevenLabsClient } from "./create-elevenlabs-client.js";
import type { ElevenLabsClient } from "./elevenlabs-client.js";

export class ElevenLabsMusicProvider implements MusicGenerationProvider {
  constructor(
    private readonly client: ElevenLabsClient = createElevenLabsClient(),
  ) {}

  async generateSong(input: GenerateSongInput): Promise<GeneratedSongResult> {
    const result = await this.client.compose({
      prompt: input.prompt,
      style: input.style,
      durationSec: input.durationSec,
    });

    return {
      audioBuffer: result.audioBuffer,
      providerJobId: result.providerJobId,
    };
  }
}
