import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../common/require-auth.js";
import { sendAppError } from "../../common/errors.js";
import { sendMusicError } from "./handle-music-error.js";
import { getMusicGenerationTrackAudio } from "./music-record.service.js";
import {
  extendMusic,
  generateLyricsForUser,
  generateMusicForUser,
  getMusicGenerationStatusForUser,
  getMusicHistory,
  getMusicTestStatus,
} from "./service.js";

interface GenerateBody {
  prompt: string;
  style?: string;
  title?: string;
  instrumental?: boolean;
  customMode?: boolean;
  referenceAudioUrl?: string;
}

interface LyricsBody {
  prompt: string;
}

interface ExtendBody {
  audioId: string;
  prompt: string;
  continueAtSec: number;
  style?: string;
  title?: string;
}

export async function registerMusicRoutes(app: FastifyInstance) {
  app.get("/api/music/test/status", async (_request, reply) => {
    return reply.send(getMusicTestStatus());
  });

  app.get(
    "/api/music/history",
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const history = await getMusicHistory(request.userId!);
        return reply.send(history);
      } catch (error) {
        return sendAppError(reply, error);
      }
    },
  );

  app.get<{ Params: { trackId: string } }>(
    "/api/music/tracks/:trackId/audio",
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const { buffer, contentType } = await getMusicGenerationTrackAudio(
          request.userId!,
          request.params.trackId,
        );

        return reply
          .header("Content-Type", contentType)
          .header("Cache-Control", "private, max-age=3600")
          .send(buffer);
      } catch (error) {
        return sendAppError(reply, error);
      }
    },
  );

  app.post<{ Body: GenerateBody }>(
    "/api/music/generate",
    { preHandler: requireAuth },
    async (request, reply) => {
      const prompt = request.body.prompt?.trim();

      if (!prompt) {
        return reply.status(400).send({ error: "prompt is required" });
      }

      try {
        const result = await generateMusicForUser(request.userId!, {
          prompt,
          style: request.body.style?.trim(),
          title: request.body.title?.trim(),
          instrumental: request.body.instrumental,
          customMode: request.body.customMode,
          referenceAudioUrl: request.body.referenceAudioUrl?.trim(),
        });

        return reply.send(result);
      } catch (error) {
        request.log.error(error);
        return sendMusicError(reply, error);
      }
    },
  );

  app.get<{ Params: { taskId: string } }>(
    "/api/music/status/:taskId",
    { preHandler: requireAuth },
    async (request, reply) => {
      const taskId = request.params.taskId.trim();

      if (!taskId) {
        return reply.status(400).send({ error: "taskId is required" });
      }

      try {
        const result = await getMusicGenerationStatusForUser(
          taskId,
          request.userId!,
        );
        return reply.send(result);
      } catch (error) {
        request.log.error(error);
        return sendAppError(reply, error);
      }
    },
  );

  app.post<{ Body: LyricsBody }>(
    "/api/music/lyrics",
    { preHandler: requireAuth },
    async (request, reply) => {
      const prompt = request.body.prompt?.trim();

      if (!prompt) {
        return reply.status(400).send({ error: "prompt is required" });
      }

      try {
        const result = await generateLyricsForUser(request.userId!, prompt);
        return reply.send(result);
      } catch (error) {
        request.log.error(error);
        return sendMusicError(reply, error);
      }
    },
  );

  app.post<{ Body: ExtendBody }>(
    "/api/music/extend",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { audioId, prompt, continueAtSec } = request.body;

      if (!audioId?.trim() || !prompt?.trim()) {
        return reply.status(400).send({
          error: "audioId and prompt are required",
        });
      }

      if (!Number.isFinite(continueAtSec) || continueAtSec <= 0) {
        return reply.status(400).send({
          error: "continueAtSec must be a positive number",
        });
      }

      try {
        const result = await extendMusic({
          audioId: audioId.trim(),
          prompt: prompt.trim(),
          continueAtSec,
          style: request.body.style?.trim(),
          title: request.body.title?.trim(),
        });

        return reply.send(result);
      } catch (error) {
        request.log.error(error);
        return sendMusicError(reply, error);
      }
    },
  );

  app.post("/api/music/callback/suno", async (request, reply) => {
    request.log.info({ body: request.body }, "Suno callback received");
    return reply.send({ received: true });
  });
}
