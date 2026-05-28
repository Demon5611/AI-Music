import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { EditOperation } from "@ai-music/shared";
import { prisma, Prisma } from "@ai-music/db";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import {
  buildSongRenderKey,
  getStorageService,
} from "../storage/storage.service.js";
import { getCurrentVersion, getSongForUser } from "./song-editor.service.js";

interface RegionSlice {
  id: string;
  startMs: number;
  endMs: number;
  replacementAudioKey: string | null;
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
  const operations = version.operations.map(
    (item) => item.payloadJson as unknown as EditOperation,
  );

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

    const mixedSegments: string[] = [];

    for (let index = 0; index < regions.length; index += 1) {
      const region = regions[index];
      const startSec = region.startMs / 1000;
      const durationSec = (region.endMs - region.startMs) / 1000;

      if (durationSec <= 0) {
        continue;
      }

      const mixedSegment = join(workDir, `mixed-${index}.mp3`);

      if (region.replacementAudioKey) {
        const replacementBuffer = await storage.get(region.replacementAudioKey);
        const replacementInput = join(workDir, `replacement-${index}.mp3`);
        await writeFile(replacementInput, replacementBuffer);

        const gainDb = Math.max(
          resolveRegionGainDb("vocal", region.id, operations),
          resolveRegionGainDb("instrumental", region.id, operations),
        );
        const filters = [
          `volume=${gainDb}dB`,
          ...resolveFadeFilters("vocal", region.id, durationSec, operations),
        ];

        await extractSegment(
          replacementInput,
          mixedSegment,
          0,
          durationSec,
          filters,
        );
        mixedSegments.push(mixedSegment);
        continue;
      }

      const vocalGainDb = resolveRegionGainDb("vocal", region.id, operations);
      const instrumentalGainDb = resolveRegionGainDb(
        "instrumental",
        region.id,
        operations,
      );

      const vocalFilters = [
        `volume=${vocalGainDb}dB`,
        ...resolveFadeFilters("vocal", region.id, durationSec, operations),
      ];
      const instrumentalFilters = [
        `volume=${instrumentalGainDb}dB`,
        ...resolveFadeFilters(
          "instrumental",
          region.id,
          durationSec,
          operations,
        ),
      ];

      const vocalSegment = join(workDir, `vocal-${index}.mp3`);
      const instrumentalSegment = join(workDir, `instrumental-${index}.mp3`);

      await extractSegment(
        vocalInput,
        vocalSegment,
        startSec,
        durationSec,
        vocalFilters,
      );
      await extractSegment(
        instrumentalInput,
        instrumentalSegment,
        startSec,
        durationSec,
        instrumentalFilters,
      );

      await mixTracks(vocalSegment, instrumentalSegment, mixedSegment);
      mixedSegments.push(mixedSegment);
    }

    const finalOutput = join(workDir, "final.mp3");

    if (mixedSegments.length === 0) {
      throw new BadRequestError("No regions available for render");
    }

    await concatSegments(mixedSegments, finalOutput);

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
