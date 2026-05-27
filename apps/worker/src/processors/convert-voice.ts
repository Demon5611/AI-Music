import {
  createKitsClient,
  createMusicService,
  downloadUrl,
  isKitsJobFailed,
  isKitsJobRunning,
  pollMusicUntilComplete,
  pollUntilComplete,
  resolveMusicProviderConfig,
} from "@ai-music/ai-providers";
import type { GenerationJob, VoiceSample } from "@ai-music/db";
import { readStorageObject } from "../common/local-storage.js";

function buildTrackTitle(prompt: string): string {
  const trimmed = prompt.trim();
  return trimmed.slice(0, 80) || "Generated Track";
}

export async function generateBaseSong(
  job: GenerationJob,
  voiceSample: VoiceSample,
): Promise<Buffer> {
  const config = resolveMusicProviderConfig();

  if (config.providerId === "sunoapi" && config.sunoApiKey.trim()) {
    const music = createMusicService();
    const started = await music.generateSong({
      prompt: job.prompt,
      style: job.style,
      title: buildTrackTitle(job.prompt),
      customMode: true,
      instrumental: false,
    });

    const completed = await pollMusicUntilComplete(music, started.taskId, {
      intervalMs: config.pollIntervalMs,
      timeoutMs: config.pollTimeoutMs,
    });

    const audioUrl = completed.tracks?.[0]?.audioUrl;

    if (!audioUrl) {
      throw new Error("Suno music generation returned no audio URL");
    }

    return downloadUrl(audioUrl);
  }

  if (process.env.AUTH_DEV_MODE === "true") {
    return readStorageObject(voiceSample.r2Key);
  }

  throw new Error("SUNO_API_KEY is required for music generation");
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
