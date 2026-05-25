import "./common/load-env.js";
import {
  closeGenerationWorker,
  createGenerationWorker,
} from "./generation.worker.js";

async function main() {
  const worker = createGenerationWorker();

  worker.on("completed", (job) => {
    console.log(`Generation job completed: ${job.id}`);
  });

  worker.on("failed", (job, error) => {
    console.error(`Generation job failed: ${job?.id ?? "unknown"}`, error);
  });

  console.log("Worker started (generation queue)");

  const shutdown = async () => {
    await closeGenerationWorker(worker);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
