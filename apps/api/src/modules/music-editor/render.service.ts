import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { EditOperation, EditorTrackId } from "@ai-music/shared";
import { prisma, Prisma } from "@ai-music/db";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import {
  buildSongRenderKey,
  getStorageService,
} from "../storage/storage.service.js";
import { parseOperations } from "./song-editor.mapper.js";
import { getCurrentVersion, getSongForUser } from "./song-editor.service.js";

interface RegionSlice {
  id: string;
  startMs: number;
  endMs: number;
  replacementAudioKey: string | null;
}

function resolveTrackRegions(
  trackId: EditorTrackId,
  regions: RegionSlice[],
  operations: EditOperation[],
): RegionSlice[] {
  const trackRegions = regions.map((region) => ({ ...region }));

  for (const operation of operations) {
    if (!("trackId" in operation) || operation.trackId !== trackId) {
      continue;
    }

    if (operation.type === "RESIZE_TRACK_REGION") {
      const region = trackRegions.find((item) => item.id === operation.regionId);

      if (region) {
        region.startMs = operation.startMs;
        region.endMs = operation.endMs;
      }
    }

    if (operation.type === "MOVE_TRACK_REGION") {
      const fromIndex = trackRegions.findIndex(
        (item) => item.id === operation.regionId,
      );

      if (fromIndex < 0) {
        continue;
      }

      const targetIndex = Math.min(operation.targetIndex, trackRegions.length - 1);
      const [moved] = trackRegions.splice(fromIndex, 1);
      trackRegions.splice(targetIndex, 0, moved);
    }
  }

  return trackRegions;
}

function resolveRegionGainDb(
  trackId: "vocal" | "instrumental",
  regionId: string,
  operations: EditOperation[],
): number {
  let gainDb = 0;
  let muted = false;

  for (const operation of operations) {
    if (!("regionId" in operation) || operation.regionId !== regionId) {
      continue;
    }

    if (
      operation.type === "SET_VOLUME" &&
      operation.trackId === trackId
    ) {
      gainDb = operation.gainDb;
    }

    if (
      operation.type === "MUTE_TRACK" &&
      operation.trackId === trackId
    ) {
      muted = operation.muted;
    }
  }

  if (muted) {
    return -80;
  }

  return gainDb;
}

function resolveFadeFilters(
  trackId: "vocal" | "instrumental",
  regionId: string,
  durationSec: number,
  operations: EditOperation[],
): string[] {
  const filters: string[] = [];

  for (const operation of operations) {
    if (
      operation.type !== "FADE" ||
      operation.trackId !== trackId ||
      operation.regionId !== regionId
    ) {
      continue;
    }

    const fadeSec = operation.durationMs / 1000;

    if (operation.fadeType === "in") {
      filters.push(`afade=t=in:st=0:d=${fadeSec}`);
    } else {
      filters.push(`afade=t=out:st=${Math.max(durationSec - fadeSec, 0)}:d=${fadeSec}`);
    }
  }

  return filters;
}

async function runFfmpeg(args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const processRef = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";

    processRef.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    processRef.on("error", (error) => {
      reject(error);
    });

    processRef.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr || `ffmpeg exited with code ${code}`));
    });
  });
}

async function extractSegment(
  inputPath: string,
  outputPath: string,
  startSec: number,
  durationSec: number,
  filters: string[],
): Promise<void> {
  const filterChain = filters.length > 0 ? ["-af", filters.join(",")] : [];
  await runFfmpeg([
    "-y",
    "-ss",
    String(startSec),
    "-t",
    String(durationSec),
    "-i",
    inputPath,
    ...filterChain,
    "-c:a",
    "libmp3lame",
    outputPath,
  ]);
}

async function concatSegments(segmentPaths: string[], outputPath: string) {
  const listPath = `${outputPath}.txt`;
  const listContent = segmentPaths.map((path) => `file '${path}'`).join("\n");
  await writeFile(listPath, listContent);

  await runFfmpeg([
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-c",
    "copy",
    outputPath,
  ]);
}

async function mixTracks(
  vocalPath: string,
  instrumentalPath: string,
  outputPath: string,
): Promise<void> {
  await runFfmpeg([
    "-y",
    "-i",
    vocalPath,
    "-i",
    instrumentalPath,
    "-filter_complex",
    "amix=inputs=2:duration=longest:dropout_transition=0",
    "-c:a",
    "libmp3lame",
    outputPath,
  ]);
}

async function renderStemTrack({
  trackId,
  inputPath,
  outputPath,
  workDir,
  regions,
  operations,
  storage,
}: {
  trackId: EditorTrackId;
  inputPath: string;
  outputPath: string;
  workDir: string;
  regions: RegionSlice[];
  operations: EditOperation[];
  storage: ReturnType<typeof getStorageService>;
}): Promise<void> {
  const segmentPaths: string[] = [];

  for (let index = 0; index < regions.length; index += 1) {
    const region = regions[index];
    const startSec = region.startMs / 1000;
    const durationSec = (region.endMs - region.startMs) / 1000;

    if (durationSec <= 0) {
      continue;
    }

    const segmentPath = join(workDir, `${trackId}-${index}.mp3`);
    const gainDb = resolveRegionGainDb(trackId, region.id, operations);
    const filters = [
      `volume=${gainDb}dB`,
      ...resolveFadeFilters(trackId, region.id, durationSec, operations),
    ];

    if (trackId === "vocal" && region.replacementAudioKey) {
      const replacementBuffer = await storage.get(region.replacementAudioKey);
      const replacementInput = join(workDir, `replacement-${index}.mp3`);
      await writeFile(replacementInput, replacementBuffer);
      await extractSegment(replacementInput, segmentPath, 0, durationSec, filters);
    } else {
      await extractSegment(inputPath, segmentPath, startSec, durationSec, filters);
    }

    segmentPaths.push(segmentPath);
  }

  if (segmentPaths.length === 0) {
    throw new BadRequestError(`No ${trackId} regions available for render`);
  }

  await concatSegments(segmentPaths, outputPath);
}

export async function renderSongVersion(userId: string, songId: string) {
  const song = await getSongForUser(userId, songId);

  if (song.status !== "ready") {
    throw new BadRequestError("Song is not ready for render");
  }

  const vocalStem = song.stems.find((stem) => stem.type === "vocal");
  const instrumentalStem = song.stems.find((stem) => stem.type === "instrumental");

  if (!vocalStem || !instrumentalStem) {
    throw new BadRequestError("Vocal and instrumental stems are required");
  }

  const version = await getCurrentVersion(songId);
  const operations = parseOperations(version.operations);

  const nextVersionNumber =
    (song.versions.at(0)?.versionNumber ?? version.versionNumber) + 1;

  const newVersion = await prisma.songVersion.create({
    data: {
      songId,
      versionNumber: nextVersionNumber,
      status: "rendering",
      operations: {
        create: operations.map((operation) => ({
          operationType: operation.type,
          payloadJson: operation as unknown as Prisma.InputJsonValue,
        })),
      },
    },
  });

  const renderJob = await prisma.renderJob.create({
    data: {
      songId,
      songVersionId: newVersion.id,
      status: "processing",
    },
  });

  try {
    const storage = getStorageService();
    const vocalBuffer = await storage.get(vocalStem.audioStorageKey);
    const instrumentalBuffer = await storage.get(
      instrumentalStem.audioStorageKey,
    );

    const workDir = await mkdtemp(join(tmpdir(), "ai-music-render-"));
    const vocalInput = join(workDir, "vocal.mp3");
    const instrumentalInput = join(workDir, "instrumental.mp3");
    await writeFile(vocalInput, vocalBuffer);
    await writeFile(instrumentalInput, instrumentalBuffer);

    const regions: RegionSlice[] = song.regions
      .slice()
      .sort((left, right) => left.orderIndex - right.orderIndex)
      .map((region) => ({
        id: region.id,
        startMs: region.startMs,
        endMs: region.endMs,
        replacementAudioKey: region.replacementAudioKey,
      }));

    const vocalOutput = join(workDir, "vocal-track.mp3");
    const instrumentalOutput = join(workDir, "instrumental-track.mp3");
    const finalOutput = join(workDir, "final.mp3");
    const vocalRegions = resolveTrackRegions("vocal", regions, operations);
    const instrumentalRegions = resolveTrackRegions(
      "instrumental",
      regions,
      operations,
    );

    await renderStemTrack({
      trackId: "vocal",
      inputPath: vocalInput,
      outputPath: vocalOutput,
      workDir,
      regions: vocalRegions,
      operations,
      storage,
    });
    await renderStemTrack({
      trackId: "instrumental",
      inputPath: instrumentalInput,
      outputPath: instrumentalOutput,
      workDir,
      regions: instrumentalRegions,
      operations,
      storage,
    });
    await mixTracks(vocalOutput, instrumentalOutput, finalOutput);

    const renderedBuffer = await readFile(finalOutput);
    const renderKey = buildSongRenderKey(userId, songId, newVersion.versionNumber);
    await storage.put(renderKey, renderedBuffer, "audio/mpeg");

    await prisma.songVersion.update({
      where: { id: newVersion.id },
      data: {
        status: "completed",
        renderedAudioKey: renderKey,
      },
    });

    await prisma.renderJob.update({
      where: { id: renderJob.id },
      data: { status: "completed" },
    });

    await rm(workDir, { recursive: true, force: true });

    return {
      renderJobId: renderJob.id,
      songVersionId: newVersion.id,
      status: "completed",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Render failed";

    await prisma.songVersion.update({
      where: { id: newVersion.id },
      data: { status: "failed" },
    });

    await prisma.renderJob.update({
      where: { id: renderJob.id },
      data: {
        status: "failed",
        errorMessage: message,
      },
    });

    if (message.includes("ENOENT") && message.includes("ffmpeg")) {
      throw new BadRequestError(
        "ffmpeg is not installed on the server",
        "FFMPEG_MISSING",
      );
    }

    throw error;
  }
}

export async function getRenderJob(userId: string, songId: string, jobId: string) {
  const job = await prisma.renderJob.findUnique({
    where: { id: jobId },
  });

  if (!job || job.songId !== songId) {
    throw new NotFoundError("Render job not found");
  }

  await getSongForUser(userId, songId);

  return job;
}
