import { Queue } from "bullmq";
import {
  logLoadControl,
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
  const job = await getProviderJobQueue().add(payload.type, payload, {
    priority,
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 200,
    removeOnFail: 200,
  });

  logLoadControl("queue_enqueue", {
    queue: PROVIDER_JOB_QUEUE_NAME,
    jobId: job.id ?? null,
    jobType: payload.type,
    priority,
    userId: payload.userId,
    recordId: "recordId" in payload ? payload.recordId : null,
  });
}

export async function closeProviderJobQueue() {
  if (queue) {
    await queue.close();
    queue = null;
  }
}
