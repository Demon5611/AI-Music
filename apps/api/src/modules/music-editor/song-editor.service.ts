import { createMusicService, downloadUrl, type StemResult } from "@ai-music/ai-providers";
import { prisma } from "@ai-music/db";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { buildSongStemKey, getStorageService } from "../storage/storage.service.js";
import { buildDefaultRegions, type SongVersionWithOperations } from "./song-editor.mapper.js";

export async function ensureSongForTrack(userId: string, trackId: string) {
  const track = await prisma.musicGenerationTrack.findUnique({
    where: { id: trackId },
    include: { musicGeneration: true, song: true },
  });

  if (!track || track.musicGeneration.userId !== userId) {
    throw new NotFoundError("Track not found");
  }

  if (!track.audioStorageKey && !track.audioSourceUrl) {
    throw new BadRequestError("Track audio is not available yet");
  }

  if (track.song) {
    return track.song;
  }

  const durationMs = track.durationSec ? track.durationSec * 1000 : 180_000;

  const song = await prisma.song.create({
    data: {
      userId,
      sourceTrackId: track.id,
      provider: "sunoapi",
      providerTaskId: track.musicGeneration.providerTaskId,
      providerTrackId: track.providerTrackId,
      prompt: track.musicGeneration.prompt,
      title: track.title,
      status: "pending_stems",
      audioStorageKey: track.audioStorageKey,
      durationMs,
      regions: {
        create: buildDefaultRegions(durationMs),
      },
      versions: {
        create: {
          versionNumber: 1,
          status: "draft",
        },
      },
    },
  });

  return song;
}

export async function getSongForUser(userId: string, songId: string) {
  const song = await prisma.song.findUnique({
    where: { id: songId },
    include: {
      stems: true,
      regions: true,
      versions: {
        include: { operations: { orderBy: { createdAt: "asc" } } },
        orderBy: { versionNumber: "desc" },
      },
    },
  });

  if (!song || song.userId !== userId) {
    throw new NotFoundError("Song not found");
  }

  return song;
}

export async function getCurrentVersion(songId: string): Promise<SongVersionWithOperations> {
  const version = await prisma.songVersion.findFirst({
    where: { songId, status: { in: ["draft", "rendering"] } },
    include: { operations: { orderBy: { createdAt: "asc" } } },
    orderBy: { versionNumber: "desc" },
  });

  if (!version) {
    throw new NotFoundError("Song version not found");
  }

  return version;
}

export async function startStemSeparation(userId: string, songId: string) {
  await kickoffStemSeparation(userId, songId);
  return tickStemSeparation(userId, songId);
}

export async function kickoffStemSeparation(userId: string, songId: string) {
  const song = await getSongForUser(userId, songId);

  if (song.status === "ready" && song.stems.length >= 2) {
    return song;
  }

  if (song.status === "separating_stems" && song.stemSeparationTaskId) {
    return song;
  }

  const musicService = createMusicService();
  const started = await musicService.separateStems({
    providerTaskId: song.providerTaskId,
    providerTrackId: song.providerTrackId,
    separationType: "separate_vocal",
  });

  return prisma.song.update({
    where: { id: song.id },
    data: {
      status: "separating_stems",
      stemSeparationTaskId: started.taskId,
    },
  });
}

export async function tickStemSeparation(userId: string, songId: string) {
  const song = await getSongForUser(userId, songId);

  if (song.status === "ready" && song.stems.length >= 2) {
    return song;
  }

  if (!song.stemSeparationTaskId) {
    await kickoffStemSeparation(userId, songId);
    return getSongForUser(userId, songId);
  }

  const musicService = createMusicService();
  const result = await musicService.getStemSeparationStatus(song.stemSeparationTaskId);

  if (result.status === "processing" || result.status === "pending") {
    return song;
  }

  if (result.status === "failed") {
    await prisma.song.update({
      where: { id: songId },
      data: { status: "failed" },
    });
    throw new BadRequestError(result.errorMessage ?? "Stem separation failed");
  }

  if (result.status !== "completed") {
    return song;
  }

  await persistStemResult(userId, songId, result);
  return getSongForUser(userId, songId);
}

async function persistStemResult(userId: string, songId: string, result: StemResult) {
  const storage = getStorageService();
  const stemPairs: Array<{ type: "vocal" | "instrumental"; url?: string }> = [
    { type: "vocal", url: result.vocalUrl },
    { type: "instrumental", url: result.instrumentalUrl },
  ];

  for (const stem of stemPairs) {
    if (!stem.url) {
      continue;
    }

    const buffer = await downloadUrl(stem.url);
    const key = buildSongStemKey(userId, songId, stem.type);
    await storage.put(key, buffer, "audio/mpeg");

    await prisma.songStem.upsert({
      where: {
        songId_type: {
          songId,
          type: stem.type,
        },
      },
      create: {
        songId,
        type: stem.type,
        audioStorageKey: key,
        durationMs: null,
      },
      update: {
        audioStorageKey: key,
      },
    });
  }

  await prisma.song.update({
    where: { id: songId },
    data: { status: "ready" },
  });
}

export async function refreshEditorProgress(userId: string, songId: string) {
  const song = await getSongForUser(userId, songId);

  if (song.status === "separating_stems") {
    return tickStemSeparation(userId, songId);
  }

  return song;
}

export async function getSongStemAudio(
  userId: string,
  songId: string,
  stemType: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  const song = await getSongForUser(userId, songId);
  const stem = song.stems.find((item) => item.type === stemType);

  if (!stem) {
    throw new NotFoundError("Stem not found");
  }

  const buffer = await getStorageService().get(stem.audioStorageKey);

  return { buffer, contentType: "audio/mpeg" };
}

export async function getSongOriginalAudio(
  userId: string,
  songId: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  const song = await getSongForUser(userId, songId);

  if (!song.audioStorageKey) {
    throw new NotFoundError("Original audio not found");
  }

  const buffer = await getStorageService().get(song.audioStorageKey);

  return { buffer, contentType: "audio/mpeg" };
}

export async function getSongVersionAudio(
  userId: string,
  songId: string,
  versionId: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  const song = await getSongForUser(userId, songId);
  const version = song.versions.find((item) => item.id === versionId);

  if (!version?.renderedAudioKey) {
    throw new NotFoundError("Rendered version not found");
  }

  const buffer = await getStorageService().get(version.renderedAudioKey);

  return { buffer, contentType: "audio/mpeg" };
}
