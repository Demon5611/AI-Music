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
