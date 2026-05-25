import { createKitsClient } from "@ai-music/ai-providers";
import type { FastifyInstance } from "fastify";
import { sendKitsError } from "./handle-kits-error.js";

const DEFAULT_VOICE_MODEL_ID = Number(
  process.env.KITS_TEST_VOICE_MODEL_ID ?? 1014961,
);

export async function registerKitsRoutes(app: FastifyInstance) {
  app.post("/api/kits/test", async (request, reply) => {
    let voiceModelId = DEFAULT_VOICE_MODEL_ID;
    let soundFile: Uint8Array | null = null;
    let filename = "audio.mp3";
    let mimeType = "audio/mpeg";

    for await (const part of request.parts()) {
      if (part.type === "file" && part.fieldname === "soundFile") {
        soundFile = await part.toBuffer();
        filename = part.filename || filename;
        mimeType = part.mimetype || mimeType;
      }

      if (part.type === "field" && part.fieldname === "voiceModelId") {
        voiceModelId = Number(part.value);
      }
    }

    if (!soundFile || soundFile.byteLength === 0) {
      return reply.status(400).send({ error: "soundFile is required" });
    }

    if (!Number.isFinite(voiceModelId)) {
      return reply.status(400).send({ error: "voiceModelId must be a number" });
    }

    try {
      const client = createKitsClient();
      const job = await client.createVoiceConversion({
        voiceModelId,
        soundFile,
        filename,
        mimeType,
      });

      return reply.send(job);
    } catch (error) {
      request.log.error(error);
      return sendKitsError(reply, error);
    }
  });

  app.get<{ Params: { id: string } }>("/api/kits/test/:id", async (request, reply) => {
    const jobId = Number(request.params.id);

    if (!Number.isFinite(jobId)) {
      return reply.status(400).send({ error: "Invalid job id" });
    }

    try {
      const client = createKitsClient();
      const job = await client.getVoiceConversion(jobId);
      return reply.send(job);
    } catch (error) {
      request.log.error(error);
      return sendKitsError(reply, error);
    }
  });
}
