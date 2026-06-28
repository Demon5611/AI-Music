import { downloadUrl } from "@ai-music/ai-providers";
import type {
  GeneratedTrack,
  GenerationStatusResult,
  GenerateSongInput,
} from "@ai-music/ai-providers";
import { prisma, Prisma } from "@ai-music/db";
import type { MusicGenerationType } from "@ai-music/shared";
import { NotFoundError } from "../../common/errors.js";
import { buildMusicTrackAudioKey, getStorageService } from "../storage/storage.service.js";
import { toMusicGenerationRecordDto } from "./music-record.mapper.js";

interface CreateRecordInput {
  userId: string;
  type: MusicGenerationType;
  providerTaskId: string;
  prompt: string;
  style?: string;
  title?: string;
  customMode?: boolean;
  instrumental?: boolean;
}

function resolveApiBaseUrl(): string {
  const port = process.env.API_PORT ?? "3001";
  return process.env.API_PUBLIC_URL ?? `http://localhost:${port}`;
}

export async function createMusicGenerationRecord(input: CreateRecordInput) {
  return prisma.musicGeneration.create({
    data: {
      userId: input.userId,
      type: input.type,
      providerTaskId: input.providerTaskId,
      prompt: input.prompt,
      style: input.style ?? null,
      title: input.title ?? null,
      customMode: input.customMode ?? false,
      instrumental: input.instrumental ?? false,
      status: "pending",
    },
    include: { tracks: true },
  });
}

export async function listMusicGenerationHistory(userId: string, limit: number) {
  const records = await prisma.musicGeneration.findMany({
    where: { userId },
    include: { tracks: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const apiBaseUrl = resolveApiBaseUrl();
  return records.map((record) => toMusicGenerationRecordDto(record, apiBaseUrl));
}

export async function syncMusicGenerationRecord(
  providerTaskId: string,
  status: GenerationStatusResult,
  userId?: string,
) {
  const record = await prisma.musicGeneration.findUnique({
    where: { providerTaskId },
    include: { tracks: true },
  });

  if (!record) {
    return null;
  }

  if (userId && record.userId !== userId) {
    throw new NotFoundError("Music generation not found");
  }

  const lyricsResult = status.lyrics;

  await prisma.musicGeneration.update({
    where: { id: record.id },
    data: {
      status: status.status,
      rawStatus: status.rawStatus ?? null,
      errorMessage: status.errorMessage ?? null,
      lyricsResult: lyricsResult ? (lyricsResult as unknown as Prisma.InputJsonValue) : undefined,
    },
  });

  if (status.tracks?.length) {
    await persistProviderTracks(record, status.tracks);
  }

  return prisma.musicGeneration.findUnique({
    where: { id: record.id },
    include: { tracks: true },
  });
}

export async function getMusicGenerationTrackAudio(
  userId: string,
  trackId: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  const track = await prisma.musicGenerationTrack.findUnique({
    where: { id: trackId },
    include: { musicGeneration: true },
  });

  if (!track || track.musicGeneration.userId !== userId) {
    throw new NotFoundError("Track not found");
  }

  if (!track.audioStorageKey) {
    throw new NotFoundError("Track audio is not stored yet");
  }

  const buffer = await getStorageService().get(track.audioStorageKey);

  return { buffer, contentType: "audio/mpeg" };
}

export function buildSongRecordInput(
  userId: string,
  input: GenerateSongInput,
  providerTaskId: string,
): CreateRecordInput {
  return {
    userId,
    type: "song",
    providerTaskId,
    prompt: input.prompt,
    style: input.style,
    title: input.title,
    customMode: input.customMode,
    instrumental: input.instrumental,
  };
}

async function persistProviderTracks(
  record: {
    id: string;
    userId: string;
    tracks: Array<{ id: string; providerTrackId: string; audioStorageKey: string | null }>;
  },
  providerTracks: GeneratedTrack[],
) {
  const storage = getStorageService();

  for (const providerTrack of providerTracks) {
    const downloadUrlValue = providerTrack.audioUrl || providerTrack.streamAudioUrl;

    if (!downloadUrlValue) {
      continue;
    }

    const existing = record.tracks.find((track) => track.providerTrackId === providerTrack.id);

    const row = await upsertTrackRow(record.id, providerTrack, {
      audioStorageKey: existing?.audioStorageKey ?? null,
      audioSourceUrl: downloadUrlValue,
    });

    if (row.audioStorageKey) {
      continue;
    }

    try {
      const buffer = await downloadUrl(downloadUrlValue);
      const audioStorageKey = buildMusicTrackAudioKey(record.userId, record.id, row.id);
      await storage.put(audioStorageKey, buffer, "audio/mpeg");
      await prisma.musicGenerationTrack.update({
        where: { id: row.id },
        data: { audioStorageKey },
      });
    } catch {
      // Keep remote source URL when local persistence fails.
    }
  }
}

async function upsertTrackRow(
  musicGenerationId: string,
  providerTrack: GeneratedTrack,
  storageState: { audioStorageKey: string | null; audioSourceUrl: string },
) {
  return prisma.musicGenerationTrack.upsert({
    where: {
      musicGenerationId_providerTrackId: {
        musicGenerationId,
        providerTrackId: providerTrack.id,
      },
    },
    create: {
      musicGenerationId,
      providerTrackId: providerTrack.id,
      title: providerTrack.title,
      durationSec: providerTrack.durationSec ?? null,
      audioStorageKey: storageState.audioStorageKey,
      audioSourceUrl: storageState.audioSourceUrl,
      imageSourceUrl: providerTrack.imageUrl ?? null,
      lyricsText: providerTrack.lyricsText ?? null,
    },
    update: {
      title: providerTrack.title,
      durationSec: providerTrack.durationSec ?? null,
      audioSourceUrl: storageState.audioSourceUrl,
      imageSourceUrl: providerTrack.imageUrl ?? null,
      lyricsText: providerTrack.lyricsText ?? null,
    },
  });
}

export async function deleteMusicGenerationTrack(userId: string, trackId: string) {
  const track = await prisma.musicGenerationTrack.findUnique({
    where: { id: trackId },
    include: { musicGeneration: true },
  });

  if (!track || track.musicGeneration.userId !== userId) {
    throw new NotFoundError("Track not found");
  }

  if (track.audioStorageKey) {
    await getStorageService().delete(track.audioStorageKey);
  }

  await prisma.musicGenerationTrack.delete({
    where: { id: trackId },
  });

  return { deleted: true };
}

export async function deleteMusicGenerations(userId: string, ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];

  if (uniqueIds.length === 0) {
    return { deletedCount: 0 };
  }

  const records = await prisma.musicGeneration.findMany({
    where: { userId, id: { in: uniqueIds } },
    include: { tracks: true },
  });

  if (records.length === 0) {
    throw new NotFoundError("Music generation not found");
  }

  const storage = getStorageService();

  await Promise.all(
    records.flatMap((record) =>
      record.tracks
        .filter((track) => Boolean(track.audioStorageKey))
        .map((track) => storage.delete(track.audioStorageKey!)),
    ),
  );

  await prisma.musicGeneration.deleteMany({
    where: {
      userId,
      id: { in: records.map((record) => record.id) },
    },
  });

  return { deletedCount: records.length };
}

export { resolveApiBaseUrl };
