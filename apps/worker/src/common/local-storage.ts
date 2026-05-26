import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { resolve } from "node:path";

function getBaseDir(): string {
  return resolve(process.env.STORAGE_LOCAL_PATH ?? "./storage");
}

export async function readStorageObject(key: string): Promise<Buffer> {
  const fullPath = join(getBaseDir(), key);
  return readFile(fullPath);
}

export async function writeStorageObject(
  key: string,
  data: Buffer,
): Promise<void> {
  const fullPath = join(getBaseDir(), key);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, data);
}

export async function deleteStorageObject(key: string): Promise<void> {
  const fullPath = join(getBaseDir(), key);

  try {
    await unlink(fullPath);
  } catch {
    // File may already be removed.
  }
}

export function buildTrackAudioKey(
  userId: string,
  trackId: string,
  extension = "mp3",
): string {
  return `tracks/${userId}/${trackId}.${extension}`;
}
