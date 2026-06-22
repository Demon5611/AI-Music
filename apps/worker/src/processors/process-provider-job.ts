import { createMusicService } from "@ai-music/ai-providers";
import { prisma, refundCreditsOnce } from "@ai-music/db";
import type { GenerateSongInput } from "@ai-music/ai-providers";
import {
  logLoadControl,
  OPERATION_COST_UNITS,
  type ProviderJobPayload,
} from "@ai-music/shared";

export async function processProviderJob(payload: ProviderJobPayload): Promise<void> {
  switch (payload.type) {
    case "music_generate":
      await processMusicGenerateJob(payload);
      return;
    case "replace_section":
      await processReplaceSectionJob(payload);
      return;
    case "stem_separation":
    case "lyrics_generate":
      return;
    default: {
      const exhaustive: never = payload;
      throw new Error(`Unknown provider job: ${JSON.stringify(exhaustive)}`);
    }
  }
}

async function processMusicGenerateJob(
  payload: Extract<ProviderJobPayload, { type: "music_generate" }>,
) {
  const record = await prisma.musicGeneration.findUnique({
    where: { id: payload.recordId },
  });

  if (!record || record.userId !== payload.userId) {
    throw new Error("Music generation record not found");
  }

  const musicService = createMusicService();
  const songInput = JSON.parse(payload.songInputJson) as GenerateSongInput;

  try {
    const result = await musicService.generateSong(songInput);

    await prisma.musicGeneration.update({
      where: { id: record.id },
      data: {
        providerTaskId: result.taskId,
        status: "pending",
      },
    });

    logLoadControl("suno_submit", {
      source: "worker",
      jobType: "music_generate",
      recordId: record.id,
      userId: payload.userId,
      taskId: result.taskId,
    });
  } catch (error) {
    await prisma.musicGeneration.update({
      where: { id: record.id },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Provider job failed",
      },
    });

    await refundCreditsOnce(
      payload.userId,
      OPERATION_COST_UNITS.generateTrack,
      `${payload.spendReason}:provider_failed`,
    ).catch(() => undefined);

    throw error;
  }
}

async function processReplaceSectionJob(
  payload: Extract<ProviderJobPayload, { type: "replace_section" }>,
) {
  const song = await prisma.song.findFirst({
    where: { id: payload.songId, userId: payload.userId },
    include: { regions: true },
  });

  if (!song?.pendingPrompt) {
    return;
  }

  const region = song.regions.find((item) => item.id === payload.regionId);
  if (!region) {
    return;
  }

  const sourceTrack = await prisma.musicGenerationTrack.findUnique({
    where: { id: song.sourceTrackId },
  });

  if (!sourceTrack?.providerTrackId) {
    return;
  }

  const musicService = createMusicService();
  const result = await musicService.extendSong({
    audioId: sourceTrack.providerTrackId,
    prompt: song.pendingPrompt,
    continueAtSec: Math.max(1, Math.floor(region.startMs / 1000)),
    style: song.prompt.slice(0, 120),
    title: song.title,
  });

  await prisma.song.update({
    where: { id: song.id },
    data: { pendingTaskId: result.taskId },
  });
}
