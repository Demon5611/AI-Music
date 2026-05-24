import Fastify from "fastify";
import { fileURLToPath } from "node:url";
import { registerAuthRoutes } from "./modules/auth/routes.js";
import { registerUserRoutes } from "./modules/users/routes.js";
import { registerVoiceSampleRoutes } from "./modules/voice-samples/routes.js";
import { registerGenerationRoutes } from "./modules/generations/routes.js";
import { registerTrackRoutes } from "./modules/tracks/routes.js";
import { registerCreditsRoutes } from "./modules/credits/routes.js";
import { registerBillingRoutes } from "./modules/billing/routes.js";
import { registerStorageRoutes } from "./modules/storage/routes.js";

const port = Number(process.env.API_PORT ?? 3001);

export async function buildApp() {
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({ status: "ok" }));

  await registerAuthRoutes(app);
  await registerUserRoutes(app);
  await registerVoiceSampleRoutes(app);
  await registerGenerationRoutes(app);
  await registerTrackRoutes(app);
  await registerCreditsRoutes(app);
  await registerBillingRoutes(app);
  await registerStorageRoutes(app);

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    reply.status(500).send({ error: "Internal Server Error" });
  });

  return app;
}

async function main() {
  const app = await buildApp();
  await app.listen({ port, host: "0.0.0.0" });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
