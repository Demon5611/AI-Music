import { mkdir, readFile, rmdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { buildTrackAudioKey } from "@ai-music/shared";

export { buildTrackAudioKey };

function isPathInsideBase(baseDir: string, targetDir: string): boolean {
  const base = resolve(baseDir);
  const target = resolve(targetDir);
  const rel = relative(base, target);

  return rel !== "" && !rel.startsWith("..");
}

async function pruneEmptyParentDirs(
  filePath: string,
  baseDir: string,
): Promise<void> {
  const resolvedBase = resolve(baseDir);
  let currentDir = resolve(dirname(filePath));

  while (
    currentDir !== resolvedBase &&
    isPathInsideBase(resolvedBase, currentDir)
  ) {
    try {
      await rmdir(currentDir);
      currentDir = dirname(currentDir);
    } catch {
      break;
    }
  }
}

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
  const baseDir = getBaseDir();
  const fullPath = join(baseDir, key);

  try {
    await unlink(fullPath);
    await pruneEmptyParentDirs(fullPath, baseDir);
  } catch {
    // File may already be removed.
  }
}
