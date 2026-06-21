import { prisma } from "@ai-music/db";
import { PROVIDER_JOB_QUEUE_NAME, type ProviderJobPayload } from "@ai-music/shared";
import { Worker } from "bullmq";
import { processProviderJob } from "./processors/process-provider-job.js";

function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

  return {
    url: redisUrl,
    maxRetriesPerRequest: null,
  };
}

export function createProviderJobWorker() {
  return new Worker<ProviderJobPayload>(
    PROVIDER_JOB_QUEUE_NAME,
    async (job) => {
      await processProviderJob(job.data);
    },
    { connection: getRedisConnection() },
  );
}

export async function closeProviderJobWorker(worker: Worker) {
  await worker.close();
  await prisma.$disconnect();
}
