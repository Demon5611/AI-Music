import { PROVIDER_JOB_QUEUE_NAME } from "@ai-music/shared";
import { Queue } from "bullmq";

function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

  return {
    url: redisUrl,
    maxRetriesPerRequest: null,
  };
}

let queue: Queue | null = null;

function getQueue(): Queue {
  if (!queue) {
    queue = new Queue(PROVIDER_JOB_QUEUE_NAME, { connection: getRedisConnection() });
  }

  return queue;
}

export async function logProviderQueueMetrics(): Promise<void> {
  const counts = await getQueue().getJobCounts("waiting", "active", "failed");
  console.info(
    `[${PROVIDER_JOB_QUEUE_NAME}] waiting=${counts.waiting ?? 0} active=${counts.active ?? 0} failed=${counts.failed ?? 0}`,
  );
}

export async function closeProviderQueueMetrics(): Promise<void> {
  if (queue) {
    await queue.close();
    queue = null;
  }
}
