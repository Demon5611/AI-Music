import {
  createKitsClient,
  downloadUrl,
  ElevenLabsMusicProvider,
  isKitsJobFailed,
  isKitsJobRunning,
  pollUntilComplete,
} from "@ai-music/ai-providers";
import type { GenerationJob, VoiceSample } from "@ai-music/db";
import { readStorageObject } from "../common/local-storage.js";

export async function generateBaseSong(
  job: GenerationJob,
  voiceSample: VoiceSample,
): Promise<Buffer> {
  if (process.env.ELEVENLABS_API_KEY) {
    const provider = new ElevenLabsMusicProvider();
    const result = await provider.generateSong({
      prompt: job.prompt,
      style: job.style,
      durationSec: job.durationSec,
    });

    return result.audioBuffer;
  }

  if (process.env.AUTH_DEV_MODE === "true") {
    return readStorageObject(voiceSample.r2Key);
  }

  throw new Error("ELEVENLABS_API_KEY is required for music generation");
}

export async function convertVoiceWithKits(
  voiceSample: VoiceSample,
  songBuffer: Buffer,
): Promise<Buffer> {
  const kitsVoiceModelId = voiceSample.kitsVoiceModelId;

  if (!kitsVoiceModelId) {
    throw new Error("Kits voice model is not linked");
  }

  const client = createKitsClient();
  const songBytes = Uint8Array.from(songBuffer);

  const separation = await client.createVocalSeparation({
    inputFile: songBytes,
    filename: "song.mp3",
    mimeType: "audio/mpeg",
  });

  const completedSeparation = await pollUntilComplete(
    () => client.getVocalSeparation(separation.id),
    (result) => !isKitsJobRunning(result.status),
  );

  if (isKitsJobFailed(completedSeparation.status)) {
    throw new Error("Kits vocal separation failed");
  }

  const vocalUrl =
    completedSeparation.vocalAudioFileUrl ??
    completedSeparation.lossyVocalAudioFileUrl;

  if (!vocalUrl) {
    throw new Error("Kits vocal separation returned no vocal track");
  }

  const vocalBuffer = await downloadUrl(vocalUrl);
  const conversion = await client.createVoiceConversion({
    voiceModelId: kitsVoiceModelId,
    soundFile: Uint8Array.from(vocalBuffer),
    filename: "vocals.mp3",
    mimeType: "audio/mpeg",
  });

  const completedConversion = await pollUntilComplete(
    () => client.getVoiceConversion(conversion.id),
    (result) => !isKitsJobRunning(result.status),
  );

  if (isKitsJobFailed(completedConversion.status)) {
    throw new Error("Kits voice conversion failed");
  }

  const outputUrl =
    completedConversion.recombinedAudioFileUrl ??
    completedConversion.outputFileUrl ??
    completedConversion.lossyOutputFileUrl;

  if (!outputUrl) {
    throw new Error("Kits voice conversion returned no output file");
  }

  return downloadUrl(outputUrl);
}
