import type { Queue } from "bullmq";
import { PROVIDER_JOB_QUEUE_NAME, type ProviderJobPayload } from "@ai-music/shared";
import { ServiceUnavailableError } from "../../common/errors.js";
import { getProviderJobQueue } from "./provider-job-queue.js";

export const PROVIDER_QUEUE_BACKPRESSURE_THRESHOLD = 80;

/** Suno submit throughput used for queue ETA (18 req / 10s). */
export const SUNO_SUBMIT_RATE_PER_SEC = 1.8;

export interface ProviderQueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  estimatedSubmitWaitSec: number;
}

export async function getProviderQueueMetrics(): Promise<ProviderQueueMetrics> {
  const counts = await getProviderJobQueue().getJobCounts(
    "waiting",
    "active",
    "completed",
    "failed",
    "delayed",
  );

  const waiting = counts.waiting ?? 0;
  const active = counts.active ?? 0;

  return {
    waiting,
    active,
    completed: counts.completed ?? 0,
    failed: counts.failed ?? 0,
    delayed: counts.delayed ?? 0,
    estimatedSubmitWaitSec: estimateProviderQueueWaitSec(waiting + active),
  };
}

export function estimateProviderQueueWaitSec(jobsAhead: number): number {
  if (jobsAhead <= 0) {
    return 0;
  }

  return Math.ceil(jobsAhead / SUNO_SUBMIT_RATE_PER_SEC);
}

export async function assertProviderQueueCapacity(): Promise<void> {
  const { waiting } = await getProviderQueueMetrics();

  if (waiting >= PROVIDER_QUEUE_BACKPRESSURE_THRESHOLD) {
    const retryAfterSec = estimateProviderQueueWaitSec(waiting);

    throw new ServiceUnavailableError(
      "Очередь генерации перегружена. Попробуйте через несколько минут.",
      retryAfterSec,
    );
  }
}

export async function logProviderQueueMetrics(
  queue: Queue<ProviderJobPayload> = getProviderJobQueue(),
): Promise<void> {
  const metrics = await getProviderQueueMetrics();
  console.info(
    `[${PROVIDER_JOB_QUEUE_NAME}] waiting=${metrics.waiting} active=${metrics.active} failed=${metrics.failed} etaSec=${metrics.estimatedSubmitWaitSec}`,
  );

  void queue;
}
