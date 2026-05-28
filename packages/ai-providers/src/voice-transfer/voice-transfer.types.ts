export interface VoiceTransferInput {
  vocalAudioBuffer: Buffer;
  voiceModelId: number;
  filename?: string;
  mimeType?: string;
}

export interface VoiceTransferResult {
  audioBuffer: Buffer;
  providerJobId: string;
}

export interface VoiceTransferProvider {
  transferVoice(input: VoiceTransferInput): Promise<VoiceTransferResult>;
}
