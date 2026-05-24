import type {
  ConvertVoiceInput,
  ConvertedVoiceResult,
  GenerateSongInput,
  GeneratedSongResult,
  MusicGenerationProvider,
  VoiceConversionProvider,
} from "./types.js";

export class ElevenLabsMusicProvider implements MusicGenerationProvider {
  async generateSong(input: GenerateSongInput): Promise<GeneratedSongResult> {
    void input;
    throw new Error("ElevenLabsMusicProvider: not implemented");
  }
}

export class KitsVoiceConversionProvider implements VoiceConversionProvider {
  async convertVoice(input: ConvertVoiceInput): Promise<ConvertedVoiceResult> {
    void input;
    throw new Error("KitsVoiceConversionProvider: not implemented");
  }
}

export * from "./types.js";
