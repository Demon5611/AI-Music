import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../common/require-auth.js";
import { sendAppError } from "../../common/errors.js";
import {
  createVoiceSample,
  deleteVoiceSample,
  linkKitsVoiceModel,
  listVoiceSamples,
} from "./service.js";

export async function registerVoiceSampleRoutes(app: FastifyInstance) {
  app.get(
    "/api/voice-samples",
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const samples = await listVoiceSamples(request.userId!);
        return reply.send(samples);
      } catch (error) {
        return sendAppError(reply, error);
      }
    },
  );

  app.post(
    "/api/voice-samples",
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        let fileBuffer: Buffer | null = null;
        let filename = "audio.mp3";
        let mimeType = "audio/mpeg";
        const fields: Record<string, string> = {};

        for await (const part of request.parts()) {
          if (part.type === "file" && part.fieldname === "soundFile") {
            fileBuffer = await part.toBuffer();
            filename = part.filename || filename;
            mimeType = part.mimetype || mimeType;
          }

          if (part.type === "field") {
            fields[part.fieldname] = String(part.value);
          }
        }

        if (!fileBuffer || fileBuffer.byteLength === 0) {
          return reply.status(400).send({ error: "soundFile is required" });
        }

        const sample = await createVoiceSample({
          userId: request.userId!,
          filename,
          mimeType,
          fileBuffer,
          fields,
        });

        return reply.status(201).send(sample);
      } catch (error) {
        return sendAppError(reply, error);
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/api/voice-samples/:id",
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        await deleteVoiceSample(request.userId!, request.params.id);
        return reply.status(204).send();
      } catch (error) {
        return sendAppError(reply, error);
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: { kitsVoiceModelId: number } }>(
    "/api/voice-samples/:id",
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const sample = await linkKitsVoiceModel(
          request.userId!,
          request.params.id,
          request.body.kitsVoiceModelId,
        );
        return reply.send(sample);
      } catch (error) {
        return sendAppError(reply, error);
      }
    },
  );
}
