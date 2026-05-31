import { createMusicService, downloadUrl } from "@ai-music/ai-providers";
import { prisma } from "@ai-music/db";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { buildSongRegionReplacementKey, getStorageService } from "../storage/storage.service.js";
import { applyOperation } from "./operation.service.js";
import { getSongForUser } from "./song-editor.service.js";

export async function startRegenerateRegion(
  userId: string,
  songId: string,
  regionId: string,
  prompt: string,
) {
  const song = await getSongForUser(userId, songId);
  const region = song.regions.find((item) => item.id === regionId);

  if (!region) {
    throw new NotFoundError("Region not found");
  }

  if (song.pendingAction && song.pendingTaskId) {
    throw new BadRequestError("Another AI action is already in progress");
  }

  const musicService = createMusicService();
  const started = await musicService.generateSong({
    prompt,
    customMode: false,
    instrumental: false,
    durationSec: Math.max(30, Math.round((region.endMs - region.startMs) / 1000)),
  });

  await prisma.song.update({
    where: { id: song.id },
    data: {
      pendingAction: "regenerate",
      pendingTaskId: started.taskId,
      pendingRegionId: regionId,
      pendingPrompt: prompt,
    },
  });

  return getSongForUser(userId, songId);
}

export async function tickPendingAiAction(userId: string, songId: string) {
  const song = await getSongForUser(userId, songId);

  if (!song.pendingAction || !song.pendingTaskId) {
    return song;
  }

  const musicService = createMusicService();
  const status = await musicService.getGenerationStatus(song.pendingTaskId);

  if (status.status === "pending" || status.status === "processing") {
    return song;
  }

  if (status.status === "failed") {
    await prisma.song.update({
      where: { id: song.id },
      data: {
        pendingAction: null,
        pendingTaskId: null,
        pendingRegionId: null,
        status: "failed",
      },
    });
    throw new BadRequestError(status.errorMessage ?? "AI action failed");
  }

  const track = status.tracks?.[0];

  if (!track?.audioUrl && !track?.streamAudioUrl) {
    throw new BadRequestError("AI provider did not return audio");
  }

  const audioUrl = track.audioUrl || track.streamAudioUrl!;
  const buffer = await downloadUrl(audioUrl);
  const storage = getStorageService();

  if (song.pendingAction === "regenerate" && song.pendingRegionId) {
    const key = buildSongRegionReplacementKey(userId, songId, song.pendingRegionId);
    await storage.put(key, buffer, "audio/mpeg");

    await prisma.songRegion.update({
      where: { id: song.pendingRegionId },
      data: { replacementAudioKey: key },
    });

    await applyOperation(
      userId,
      songId,
      {
        type: "REGENERATE_REGION",
        regionId: song.pendingRegionId,
        prompt: song.pendingPrompt ?? "regenerated region",
      },
      { selectedRegionId: song.pendingRegionId },
    );

    await clearPendingAction(song.id);
    return getSongForUser(userId, songId);
  }

  await clearPendingAction(song.id);
  return getSongForUser(userId, songId);
}

async function clearPendingAction(songId: string) {
  await prisma.song.update({
    where: { id: songId },
    data: {
      pendingAction: null,
      pendingTaskId: null,
      pendingRegionId: null,
      pendingPrompt: null,
    },
  });
}
