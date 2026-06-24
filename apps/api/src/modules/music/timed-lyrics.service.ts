import { randomUUID } from "node:crypto";
import { createMusicService } from "@ai-music/ai-providers";
import { prisma, Prisma } from "@ai-music/db";
import {
  OPERATION_COST_UNITS,
  parseTimedLyricsJson,
  type TimedLyricsLine,
  type TimedLyricsResponseDto,
} from "@ai-music/shared";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { refundCredits, spendCredits } from "../credits/service.js";
import { assertFeature } from "../billing/entitlements.service.js";

const musicService = createMusicService();

type TrackWithGeneration = Prisma.MusicGenerationTrackGetPayload<{
  include: { musicGeneration: true };
}>;

function resolveCachedLines(track: TrackWithGeneration): TimedLyricsLine[] | null {
  return parseTimedLyricsJson(track.timedLyricsJson);
}

function assertKaraokeEligibleTrack(track: TrackWithGeneration): void {
  if (track.musicGeneration.type !== "song") {
    throw new BadRequestError("Karaoke Sync доступен только для музыкальных треков");
  }

  if (track.musicGeneration.instrumental) {
    throw new BadRequestError("Для инструментальных треков Karaoke Sync недоступен");
  }

  if (!track.lyricsText?.trim()) {
    throw new BadRequestError("У трека нет текста для Karaoke Sync");
  }
}

async function loadTrackForUser(userId: string, trackId: string): Promise<TrackWithGeneration> {
  const track = await prisma.musicGenerationTrack.findUnique({
    where: { id: trackId },
    include: { musicGeneration: true },
  });

  if (!track || track.musicGeneration.userId !== userId) {
    throw new NotFoundError("Track not found");
  }

  return track;
}

export async function getTimedLyricsForTrack(
  userId: string,
  trackId: string,
): Promise<TimedLyricsResponseDto> {
  const track = await loadTrackForUser(userId, trackId);
  assertKaraokeEligibleTrack(track);

  const lines = resolveCachedLines(track);

  if (!lines || lines.length === 0) {
    throw new NotFoundError("Timed lyrics not cached for this track");
  }

  return { lines, cached: true };
}

export async function fetchTimedLyricsForTrack(
  userId: string,
  trackId: string,
): Promise<TimedLyricsResponseDto> {
  await assertFeature(userId, "karaokeSync");

  const track = await loadTrackForUser(userId, trackId);
  assertKaraokeEligibleTrack(track);

  const cachedLines = resolveCachedLines(track);

  if (cachedLines && cachedLines.length > 0) {
    return { lines: cachedLines, cached: true };
  }

  const spendReason = `karaoke_lyrics:${trackId}:${randomUUID()}`;
  await spendCredits(userId, OPERATION_COST_UNITS.karaokeLyrics, spendReason);

  try {
    const freshTrack = await prisma.musicGenerationTrack.findUnique({
      where: { id: trackId },
      include: { musicGeneration: true },
    });

    const freshLines = freshTrack ? resolveCachedLines(freshTrack) : null;

    if (freshLines && freshLines.length > 0) {
      await refundCredits(
        userId,
        OPERATION_COST_UNITS.karaokeLyrics,
        `karaoke_lyrics_duplicate:${spendReason}`,
      ).catch(() => undefined);

      return { lines: freshLines, cached: true };
    }

    if (!musicService.getTimestampedLyrics) {
      throw new BadRequestError("Karaoke Sync недоступен для текущего music provider");
    }

    const result = await musicService.getTimestampedLyrics({
      taskId: track.musicGeneration.providerTaskId,
      audioId: track.providerTrackId,
    });

    await prisma.musicGenerationTrack.update({
      where: { id: trackId },
      data: {
        timedLyricsJson: result.lines as unknown as Prisma.InputJsonValue,
      },
    });

    return { lines: result.lines, cached: false };
  } catch (error) {
    await refundCredits(
      userId,
      OPERATION_COST_UNITS.karaokeLyrics,
      `karaoke_lyrics_failed:${spendReason}`,
    ).catch(() => undefined);

    throw error;
  }
}
