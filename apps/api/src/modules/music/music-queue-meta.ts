import type { MusicQueuePhase } from "@ai-music/shared";
import type { GenerationStatusResult } from "@ai-music/ai-providers";
import type { MusicGeneration } from "@ai-music/db";
import { estimateProviderQueueWaitSec } from "../queue/provider-queue-metrics.js";

export function resolveMusicQueuePhase(
  record: Pick<MusicGeneration, "providerTaskId" | "status">,
  status: GenerationStatusResult,
): MusicQueuePhase {
  if (status.status === "completed") {
    return "completed";
  }

  if (status.status === "failed" || record.status === "failed") {
    return "failed";
  }

  if (record.providerTaskId.startsWith("queue:")) {
    return "queued";
  }

  if (status.status === "processing") {
    return "processing";
  }

  return "submitted";
}

export function resolveMusicQueueEtaSec(queuePhase: MusicQueuePhase, waitingJobs: number): number | undefined {
  if (queuePhase !== "queued") {
    return undefined;
  }

  return estimateProviderQueueWaitSec(Math.max(waitingJobs, 1));
}
