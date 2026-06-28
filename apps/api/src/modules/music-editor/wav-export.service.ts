import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { OPERATION_COST_UNITS, type ExportWavResponseDto } from "@ai-music/shared";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { assertFfmpegAvailable, convertMp3FileToWav, isFfmpegMissingError } from "../../common/ffmpeg-audio.js";
import { assertFeature } from "../billing/entitlements.service.js";
import { refundCreditsOnce, spendCreditsOnce } from "../credits/service.js";
import { resolveApiBaseUrl } from "../music/music-record.service.js";
import { buildSongWavExportKey, getStorageService } from "../storage/storage.service.js";
import { getSongForUser } from "./song-editor.service.js";

function buildWavDownloadUrl(songId: string, versionId: string, apiBaseUrl: string): string {
  return `${apiBaseUrl}/api/music/songs/${songId}/versions/${versionId}/wav`;
}

async function isWavExportCached(wavKey: string): Promise<boolean> {
  try {
    await getStorageService().get(wavKey);
    return true;
  } catch {
    return false;
  }
}

function resolveLatestCompletedVersion(
  song: Awaited<ReturnType<typeof getSongForUser>>,
  versionId?: string,
) {
  if (versionId) {
    const version = song.versions.find((item) => item.id === versionId);

    if (!version || version.status !== "completed" || !version.renderedAudioKey) {
      throw new BadRequestError("Выберите готовую render-версию для экспорта WAV");
    }

    return version;
  }

  const latestCompleted = song.versions.find(
    (version) => version.status === "completed" && version.renderedAudioKey,
  );

  if (!latestCompleted) {
    throw new BadRequestError(
      "Сначала выполните Render version — экспорт WAV доступен для готовых MP3-версий",
    );
  }

  return latestCompleted;
}

export async function exportSongWav(
  userId: string,
  songId: string,
  versionId?: string,
): Promise<ExportWavResponseDto> {
  await assertFeature(userId, "wavExport");
  await assertFfmpegAvailable();

  const song = await getSongForUser(userId, songId);

  if (song.status !== "ready") {
    throw new BadRequestError("Редактор ещё не готов для экспорта WAV");
  }

  const version = resolveLatestCompletedVersion(song, versionId);
  const wavKey = buildSongWavExportKey(userId, songId, version.versionNumber);
  const apiBaseUrl = resolveApiBaseUrl();
  const wavAudioUrl = buildWavDownloadUrl(songId, version.id, apiBaseUrl);

  if (await isWavExportCached(wavKey)) {
    return {
      wavAudioUrl,
      versionId: version.id,
      versionNumber: version.versionNumber,
      cached: true,
    };
  }

  const spendReason = `wav_export:${songId}:v${version.versionNumber}`;
  const charged = await spendCreditsOnce(userId, OPERATION_COST_UNITS.wavExport, spendReason);

  try {
    const storage = getStorageService();
    const mp3Buffer = await storage.get(version.renderedAudioKey!);
    const workDir = await mkdtemp(join(tmpdir(), "ai-music-wav-export-"));
    const inputPath = join(workDir, "input.mp3");
    const outputPath = join(workDir, "output.wav");

    await writeFile(inputPath, mp3Buffer);
    await convertMp3FileToWav(inputPath, outputPath);

    const wavBuffer = await readFile(outputPath);
    await storage.put(wavKey, wavBuffer, "audio/wav");
    await rm(workDir, { recursive: true, force: true });

    return {
      wavAudioUrl,
      versionId: version.id,
      versionNumber: version.versionNumber,
      cached: false,
    };
  } catch (error) {
    if (charged) {
      await refundCreditsOnce(
        userId,
        OPERATION_COST_UNITS.wavExport,
        `wav_export_refund:${spendReason}`,
      ).catch(() => undefined);
    }

    if (isFfmpegMissingError(error)) {
      throw error;
    }

    throw error;
  }
}

export async function getSongVersionWav(
  userId: string,
  songId: string,
  versionId: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  await assertFeature(userId, "wavExport");

  const song = await getSongForUser(userId, songId);
  const version = song.versions.find((item) => item.id === versionId);

  if (!version || version.status !== "completed") {
    throw new NotFoundError("Rendered version not found");
  }

  const wavKey = buildSongWavExportKey(userId, songId, version.versionNumber);

  try {
    const buffer = await getStorageService().get(wavKey);
    return { buffer, contentType: "audio/wav" };
  } catch {
    throw new NotFoundError("WAV export not found. Create export first.");
  }
}
