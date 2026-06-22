import { mapSunoMusicCallbackToStatus } from "@ai-music/ai-providers";
import { sunoMusicCallbackSchema, type SunoMusicCallbackPayload } from "@ai-music/shared";
import { syncMusicGenerationRecord } from "./music-record.service.js";

export async function handleSunoMusicCallback(payload: unknown): Promise<boolean> {
  const parsed = sunoMusicCallbackSchema.safeParse(payload);

  if (!parsed.success) {
    return false;
  }

  return processSunoMusicCallback(parsed.data);
}

async function processSunoMusicCallback(payload: SunoMusicCallbackPayload): Promise<boolean> {
  if (payload.code !== 200 || !payload.data) {
    return true;
  }

  const taskId = payload.data.task_id ?? payload.data.taskId;

  if (!taskId) {
    return true;
  }

  const tracks = payload.data.data ?? [];
  const status = mapSunoMusicCallbackToStatus(
    taskId,
    payload.data.callbackType,
    tracks,
  );

  await syncMusicGenerationRecord(taskId, status);

  return true;
}
