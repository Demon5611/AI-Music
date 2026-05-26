import type { VoiceSample } from "@ai-music/db";
import { readStorageObject } from "../common/local-storage.js";

export interface PreprocessedVoice {
  voiceSample: VoiceSample;
  sampleBuffer: Buffer;
}

export async function preprocessVoice(
  voiceSample: VoiceSample,
): Promise<PreprocessedVoice> {
  if (!voiceSample.kitsVoiceModelId) {
    throw new Error("Kits voice model is not linked");
  }

  if (voiceSample.status !== "ready" || !voiceSample.consentConfirmed) {
    throw new Error("Voice sample is not ready");
  }

  const sampleBuffer = await readStorageObject(voiceSample.r2Key);

  if (sampleBuffer.byteLength === 0) {
    throw new Error("Voice sample file is empty");
  }

  return { voiceSample, sampleBuffer };
}
