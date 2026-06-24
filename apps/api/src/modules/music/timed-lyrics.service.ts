import { randomUUID } from "node:crypto";
import { createMusicService } from "@ai-music/ai-providers";
import { prisma, Prisma } from "@ai-music/db";
import {
  OPERATION_COST_UNITS,
  parseTimedLyricsCache,
  serializeTimedLyricsCache,
  type TimedLyricsPayload,
  type TimedLyricsResponseDto,
} from "@ai-music/shared";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { refundCredits, spendCredits } from "../credits/service.js";
import { assertFeature } from "../billing/entitlements.service.js";

const musicService = createMusicService();

type TrackWithGeneration = Prisma.MusicGenerationTrackGetPayload<{
  include: { musicGeneration: true };
}>;

function resolveCachedPayload(track: TrackWithGeneration): TimedLyricsPayload | null {
  return parseTimedLyricsCache(track.timedLyricsJson);
}

function hasWordLevelCache(payload: TimedLyricsPayload | null): boolean {
  return Boolean(payload?.lines.length && payload.words?.length);
}

function hasLineLevelCache(payload: TimedLyricsPayload | null): boolean {
  return Boolean(payload?.lines.length);
}

function toResponseDto(payload: TimedLyricsPayload, cached: boolean): TimedLyricsResponseDto {
  return {
    lines: payload.lines,
    words: payload.words,
    cached,
  };
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

async function fetchAndPersistTimedLyrics(
  track: TrackWithGeneration,
): Promise<TimedLyricsPayload> {
  if (!musicService.getTimestampedLyrics) {
    throw new BadRequestError("Karaoke Sync недоступен для текущего music provider");
  }

  const result = await musicService.getTimestampedLyrics({
    taskId: track.musicGeneration.providerTaskId,
    audioId: track.providerTrackId,
  });

  const payload: TimedLyricsPayload = {
    lines: result.lines,
    words: result.words,
  };

  await prisma.musicGenerationTrack.update({
    where: { id: track.id },
    data: {
      timedLyricsJson: serializeTimedLyricsCache(payload) as unknown as Prisma.InputJsonValue,
    },
  });

  return payload;
}

export async function getTimedLyricsForTrack(
  userId: string,
  trackId: string,
): Promise<TimedLyricsResponseDto> {
  const track = await loadTrackForUser(userId, trackId);
  assertKaraokeEligibleTrack(track);

  const payload = resolveCachedPayload(track);

  if (!hasLineLevelCache(payload) || !payload) {
    throw new NotFoundError("Timed lyrics not cached for this track");
  }

  return toResponseDto(payload, true);
}

export async function fetchTimedLyricsForTrack(
  userId: string,
  trackId: string,
): Promise<TimedLyricsResponseDto> {
  await assertFeature(userId, "karaokeSync");

  const track = await loadTrackForUser(userId, trackId);
  assertKaraokeEligibleTrack(track);

  const cachedPayload = resolveCachedPayload(track);

  if (hasWordLevelCache(cachedPayload) && cachedPayload) {
    return toResponseDto(cachedPayload, true);
  }

  const isWordUpgrade = hasLineLevelCache(cachedPayload);
  const spendReason = `karaoke_lyrics:${trackId}:${randomUUID()}`;

  if (!isWordUpgrade) {
    await spendCredits(userId, OPERATION_COST_UNITS.karaokeLyrics, spendReason);
  }

  try {
    const freshTrack = await prisma.musicGenerationTrack.findUnique({
      where: { id: trackId },
      include: { musicGeneration: true },
    });

    const freshPayload = freshTrack ? resolveCachedPayload(freshTrack) : null;

    if (hasWordLevelCache(freshPayload) && freshPayload) {
      if (!isWordUpgrade) {
        await refundCredits(
          userId,
          OPERATION_COST_UNITS.karaokeLyrics,
          `karaoke_lyrics_duplicate:${spendReason}`,
        ).catch(() => undefined);
      }

      return toResponseDto(freshPayload, true);
    }

    const trackForFetch = freshTrack ?? track;
    const payload = await fetchAndPersistTimedLyrics(trackForFetch);

    return toResponseDto(payload, isWordUpgrade);
  } catch (error) {
    if (!isWordUpgrade) {
      await refundCredits(
        userId,
        OPERATION_COST_UNITS.karaokeLyrics,
        `karaoke_lyrics_failed:${spendReason}`,
      ).catch(() => undefined);
    }

    throw error;
  }
}
