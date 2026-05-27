export interface GenerateSongInput {
  prompt: string;
  style: string;
  durationSec: number;
}

export interface GeneratedSongResult {
  audioBuffer: Buffer;
  providerJobId: string | null;
}

export interface ConvertVoiceInput {
  sourceAudioUrl: string;
  voiceSampleUrl: string;
}

export interface ConvertedVoiceResult {
  audioUrl: string;
  providerJobId: string;
}

export interface MusicGenerationProvider {
  generateSong(input: GenerateSongInput): Promise<GeneratedSongResult>;
}

export interface VoiceConversionProvider {
  convertVoice(input: ConvertVoiceInput): Promise<ConvertedVoiceResult>;
}
