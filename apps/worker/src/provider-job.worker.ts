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
  const concurrency = Number(process.env.WORKER_PROVIDER_CONCURRENCY ?? 4);

  return new Worker<ProviderJobPayload>(
    PROVIDER_JOB_QUEUE_NAME,
    async (job) => {
      const startedAt = Date.now();
      const waitMs = job.processedOn && job.timestamp ? job.processedOn - job.timestamp : null;

      console.info(
        `[provider-job] start type=${job.data.type} id=${job.id} waitMs=${waitMs ?? "n/a"}`,
      );

      try {
        await processProviderJob(job.data);
        const durationMs = Date.now() - startedAt;
        console.info(
          `[provider-job] done type=${job.data.type} id=${job.id} durationMs=${durationMs}`,
        );
      } catch (error) {
        const durationMs = Date.now() - startedAt;
        console.error(
          `[provider-job] failed type=${job.data.type} id=${job.id} durationMs=${durationMs}`,
          error,
        );
        throw error;
      }
    },
    { connection: getRedisConnection(), concurrency },
  );
}

export async function closeProviderJobWorker(worker: Worker) {
  await worker.close();
  await prisma.$disconnect();
}
