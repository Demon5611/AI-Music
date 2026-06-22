import "./common/load-env.js";
import {
  closeGenerationWorker,
  createGenerationWorker,
} from "./generation.worker.js";
import {
  closeProviderJobWorker,
  createProviderJobWorker,
} from "./provider-job.worker.js";
import {
  closeProviderQueueMetrics,
  logProviderQueueMetrics,
} from "./common/log-provider-queue-metrics.js";

const QUEUE_METRICS_INTERVAL_MS = 60_000;

async function main() {
  const generationWorker = createGenerationWorker();
  const providerJobWorker = createProviderJobWorker();

  generationWorker.on("completed", (job) => {
    console.log(`Generation job completed: ${job.id}`);
  });

  generationWorker.on("failed", (job, error) => {
    console.error(`Generation job failed: ${job?.id ?? "unknown"}`, error);
  });

  providerJobWorker.on("completed", (job) => {
    console.log(`Provider job completed: ${job.id}`);
  });

  providerJobWorker.on("failed", (job, error) => {
    console.error(`Provider job failed: ${job?.id ?? "unknown"}`, error);
  });

  console.log("Worker started (generation + provider-jobs queues)");

  void logProviderQueueMetrics();
  const metricsTimer = setInterval(() => {
    void logProviderQueueMetrics();
  }, QUEUE_METRICS_INTERVAL_MS);

  const shutdown = async () => {
    clearInterval(metricsTimer);
    await closeGenerationWorker(generationWorker);
    await closeProviderJobWorker(providerJobWorker);
    await closeProviderQueueMetrics();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
