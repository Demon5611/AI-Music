import { Queue } from "bullmq";
import {
  PROVIDER_JOB_QUEUE_NAME,
  type ProviderJobPayload,
} from "@ai-music/shared";

let queue: Queue<ProviderJobPayload> | null = null;

function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

  return {
    url: redisUrl,
    maxRetriesPerRequest: null,
  };
}

export function getProviderJobQueue(): Queue<ProviderJobPayload> {
  if (!queue) {
    queue = new Queue<ProviderJobPayload>(PROVIDER_JOB_QUEUE_NAME, {
      connection: getRedisConnection(),
    });
  }

  return queue;
}

export async function enqueueProviderJob(payload: ProviderJobPayload, priority: number) {
  await getProviderJobQueue().add(payload.type, payload, {
    priority,
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 200,
    removeOnFail: 200,
  });
}

export async function closeProviderJobQueue() {
  if (queue) {
    await queue.close();
    queue = null;
  }
}
