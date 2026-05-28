import "./common/load-env.js";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { fileURLToPath } from "node:url";
import { isAppError } from "./common/errors.js";
import { registerAuthPlugin } from "./modules/auth/plugin.js";
import { registerAuthRoutes } from "./modules/auth/routes.js";
import { registerUserRoutes } from "./modules/users/routes.js";
import { registerVoiceSampleRoutes } from "./modules/voice-samples/routes.js";
import { registerGenerationRoutes } from "./modules/generations/routes.js";
import { registerTrackRoutes } from "./modules/tracks/routes.js";
import { registerCreditsRoutes } from "./modules/credits/routes.js";
import { registerBillingRoutes } from "./modules/billing/routes.js";
import { registerStorageRoutes } from "./modules/storage/routes.js";
import { registerKitsRoutes } from "./modules/kits/routes.js";
import { registerMusicRoutes } from "./modules/music/routes.js";
import { registerMusicEditorRoutes } from "./modules/music-editor/routes.js";
import { closeGenerationQueue } from "./modules/queue/generation-queue.js";

const port = Number(process.env.API_PORT ?? 3001);

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: [process.env.WEB_ORIGIN ?? "http://localhost:3000"],
    methods: ["GET", "POST", "PATCH", "DELETE"],
  });

  await app.register(multipart, {
    limits: { fileSize: 100 * 1024 * 1024 },
  });

  await registerAuthPlugin(app);

  app.get("/health", async () => ({ status: "ok" }));

  await registerAuthRoutes(app);
  await registerUserRoutes(app);
  await registerVoiceSampleRoutes(app);
  await registerGenerationRoutes(app);
  await registerTrackRoutes(app);
  await registerCreditsRoutes(app);
  await registerBillingRoutes(app);
  await registerStorageRoutes(app);
  await registerMusicRoutes(app);
  await registerMusicEditorRoutes(app);
  await registerKitsRoutes(app);

  app.setErrorHandler((error, _request, reply) => {
    if (isAppError(error)) {
      return reply.status(error.statusCode).send({
        error: error.message,
        code: error.code,
      });
    }

    app.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  });

  return app;
}

async function main() {
  const app = await buildApp();

  const shutdown = async () => {
    await closeGenerationQueue();
    await app.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await app.listen({ port, host: "0.0.0.0" });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
