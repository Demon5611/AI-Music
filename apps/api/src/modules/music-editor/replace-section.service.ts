import { createMusicService, downloadUrl } from "@ai-music/ai-providers";
import { prisma } from "@ai-music/db";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { refundCreditsOnce, spendCreditsOnce } from "../credits/service.js";
import {
  assertFeature,
  getQueuePriorityForUser,
} from "../billing/entitlements.service.js";
import { OPERATION_COST_UNITS, buildSongRegionReplacementKey } from "@ai-music/shared";
import { getStorageService } from "../storage/storage.service.js";
import { getCurrentVersion, getSongForUser } from "./song-editor.service.js";
import { enqueueProviderJob } from "../queue/provider-job-queue.js";

const PENDING_REPLACE_ACTION = "replace_section";
const REPLACE_SECTION_STALE_MS = 20_000;

export async function startReplaceSection(
  userId: string,
  songId: string,
  regionId: string,
  prompt: string,
) {
  await assertFeature(userId, "replaceSections");

  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) {
    throw new BadRequestError("prompt is required");
  }

  const song = await getSongForUser(userId, songId);
  const region = song.regions.find((item) => item.id === regionId);

  if (!region) {
    throw new NotFoundError("Region not found");
  }

  if (song.pendingAction) {
    throw new BadRequestError("Другая операция редактора уже выполняется");
  }

  const spendReason = `replace_section:${song.id}:${regionId}`;
  const charged = await spendCreditsOnce(
    userId,
    OPERATION_COST_UNITS.replaceSection,
    spendReason,
  );

  try {
    const priority = await getQueuePriorityForUser(userId);

    await prisma.song.update({
      where: { id: song.id },
      data: {
        pendingAction: PENDING_REPLACE_ACTION,
        pendingRegionId: regionId,
        pendingPrompt: trimmedPrompt,
        pendingTaskId: null,
      },
    });

    await enqueueProviderJob(
      {
        type: "replace_section",
        userId,
        songId: song.id,
        regionId,
        spendReason,
      },
      priority,
    );
  } catch (error) {
    if (charged) {
      await refundCreditsOnce(
        userId,
        OPERATION_COST_UNITS.replaceSection,
        `${spendReason}:enqueue_failed`,
      ).catch(() => undefined);
    }

    await prisma.song.update({
      where: { id: song.id },
      data: {
        pendingAction: null,
        pendingRegionId: null,
        pendingPrompt: null,
        pendingTaskId: null,
      },
    });

    throw error;
  }

  return getSongForUser(userId, songId);
}

export async function tickReplaceSection(userId: string, songId: string) {
  const song = await getSongForUser(userId, songId);

  if (song.pendingAction !== PENDING_REPLACE_ACTION) {
    return song;
  }

  if (!song.pendingTaskId) {
    const staleMs = Date.now() - song.updatedAt.getTime();
    if (staleMs >= REPLACE_SECTION_STALE_MS) {
      await clearReplacePending(song.id);
      await refundReplaceSection(userId, song.id, song.pendingRegionId ?? "unknown");
      return getSongForUser(userId, songId);
    }

    return song;
  }

  const musicService = createMusicService();
  const status = await musicService.getGenerationStatus(song.pendingTaskId);

  if (status.status === "pending" || status.status === "processing") {
    return song;
  }

  if (status.status === "failed") {
    await clearReplacePending(song.id);
    await refundReplaceSection(userId, song.id, song.pendingRegionId ?? "unknown");
    return getSongForUser(userId, songId);
  }

  const track = status.tracks?.[0];
  if (!track?.audioUrl || !song.pendingRegionId) {
    await clearReplacePending(song.id);
    await refundReplaceSection(userId, song.id, song.pendingRegionId ?? "unknown");
    return getSongForUser(userId, songId);
  }

  const buffer = await downloadUrl(track.audioUrl);
  const storageKey = buildSongRegionReplacementKey(userId, songId, song.pendingRegionId);
  await getStorageService().put(storageKey, buffer, "audio/mpeg");

  await prisma.songRegion.update({
    where: { id: song.pendingRegionId },
    data: { replacementAudioKey: storageKey },
  });

  const version = await getCurrentVersion(songId);
  await prisma.editOperation.create({
    data: {
      songVersionId: version.id,
      operationType: "REPLACE_SECTION",
      payloadJson: {
        type: "REPLACE_SECTION",
        regionId: song.pendingRegionId,
        prompt: song.pendingPrompt ?? "",
      },
    },
  });

  await clearReplacePending(song.id);
  return getSongForUser(userId, songId);
}

async function clearReplacePending(songId: string) {
  await prisma.song.update({
    where: { id: songId },
    data: {
      pendingAction: null,
      pendingRegionId: null,
      pendingPrompt: null,
      pendingTaskId: null,
    },
  });
}

async function refundReplaceSection(
  userId: string,
  songId: string,
  regionId: string,
): Promise<void> {
  await refundCreditsOnce(
    userId,
    OPERATION_COST_UNITS.replaceSection,
    `replace_section_refund:${songId}:${regionId}`,
  ).catch(() => undefined);
}

export { PENDING_REPLACE_ACTION };
