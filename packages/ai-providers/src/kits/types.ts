export type KitsJobStatus = "running" | "success" | "error" | "cancelled";

export interface KitsInferenceJob {
  id: number;
  createdAt: string;
  type: "infer" | "tts";
  status: KitsJobStatus;
  jobStartTime: string | null;
  jobEndTime: string | null;
  outputFileUrl: string | null;
  lossyOutputFileUrl: string | null;
  recombinedAudioFileUrl: string | null;
  voiceModelId: string | number | null;
}

export interface CreateKitsVoiceConversionInput {
  voiceModelId: number;
  soundFile: Uint8Array;
  filename: string;
  mimeType?: string;
}
