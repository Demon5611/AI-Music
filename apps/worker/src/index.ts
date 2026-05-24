import { GENERATION_QUEUE_NAME } from "./generation.worker.js";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

async function main() {
  console.log(`Worker starting (queue: ${GENERATION_QUEUE_NAME})`);
  console.log(`Redis: ${redisUrl}`);
  console.log("BullMQ processor will be wired in Sprint 3.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
