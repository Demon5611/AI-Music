import "./common/load-env.js";
import {
  closeGenerationWorker,
  createGenerationWorker,
} from "./generation.worker.js";
import {
  closeProviderJobWorker,
  createProviderJobWorker,
} from "./provider-job.worker.js";

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

  const shutdown = async () => {
    await closeGenerationWorker(generationWorker);
    await closeProviderJobWorker(providerJobWorker);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
