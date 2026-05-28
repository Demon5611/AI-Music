import type { FastifyInstance } from "fastify";
import { ApplyOperationBodySchema, VoiceTransferBodySchema } from "@ai-music/shared";
import { requireAuth } from "../../common/require-auth.js";
import { sendAppError } from "../../common/errors.js";
import { applyOperation, previewOperation } from "./operation.service.js";
import { renderSongVersion } from "./render.service.js";
import {
  ensureSongForTrack,
  getCurrentVersion,
  getSongForUser,
  getSongOriginalAudio,
  getSongStemAudio,
  getSongVersionAudio,
  startStemSeparation,
} from "./song-editor.service.js";
import { toEditorStateDto } from "./song-editor.mapper.js";
import { transferVoiceForRegion } from "./voice-transfer.service.js";

export async function registerMusicEditorRoutes(app: FastifyInstance) {
  app.post<{ Params: { trackId: string } }>(
    "/api/music/tracks/:trackId/editor",
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const song = await ensureSongForTrack(
          request.userId!,
          request.params.trackId,
        );

        return reply.send({
          songId: song.id,
          status: song.status,
        });
      } catch (error) {
        return sendAppError(reply, error);
      }
    },
  );

  app.get<{ Params: { songId: string } }>(
    "/api/music/:songId",
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const song = await getSongForUser(request.userId!, request.params.songId);
        const version = await getCurrentVersion(song.id);
        return reply.send(toEditorStateDto(song, version));
      } catch (error) {
        return sendAppError(reply, error);
      }
    },
  );

  app.get<{ Params: { songId: string } }>(
    "/api/music/:songId/editor-state",
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const song = await getSongForUser(request.userId!, request.params.songId);
        const version = await getCurrentVersion(song.id);
        return reply.send(toEditorStateDto(song, version));
      } catch (error) {
        return sendAppError(reply, error);
      }
    },
  );

  app.post<{ Params: { songId: string } }>(
    "/api/music/:songId/separate-stems",
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const song = await startStemSeparation(
          request.userId!,
          request.params.songId,
        );
        const version = await getCurrentVersion(song.id);
        return reply.send(toEditorStateDto(song, version));
      } catch (error) {
        return sendAppError(reply, error);
      }
    },
  );

  app.post<{ Params: { songId: string }; Body: unknown }>(
    "/api/music/:songId/operations",
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = ApplyOperationBodySchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      try {
        const song = await applyOperation(
          request.userId!,
          request.params.songId,
          parsed.data.operation,
          {
            selectedRegionId: parsed.data.selectedRegionId,
            selectedTrackId: parsed.data.selectedTrackId,
          },
        );
        const version = await getCurrentVersion(song.id);
        return reply.send(toEditorStateDto(song, version));
      } catch (error) {
        return sendAppError(reply, error);
      }
    },
  );

  app.post<{ Params: { songId: string }; Body: unknown }>(
    "/api/music/:songId/preview-operation",
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = ApplyOperationBodySchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      try {
        const result = await previewOperation(
          request.userId!,
          request.params.songId,
          parsed.data.operation,
          {
            selectedRegionId: parsed.data.selectedRegionId,
            selectedTrackId: parsed.data.selectedTrackId,
          },
        );
        return reply.send(result);
      } catch (error) {
        return sendAppError(reply, error);
      }
    },
  );

  app.post<{ Params: { songId: string } }>(
    "/api/music/:songId/render",
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const result = await renderSongVersion(
          request.userId!,
          request.params.songId,
        );
        return reply.send(result);
      } catch (error) {
        return sendAppError(reply, error);
      }
    },
  );

  app.post<{ Params: { songId: string }; Body: unknown }>(
    "/api/music/:songId/voice-transfer",
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = VoiceTransferBodySchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      try {
        const song = await transferVoiceForRegion(
          request.userId!,
          request.params.songId,
          parsed.data.regionId,
          parsed.data.voiceModelId,
        );
        const version = await getCurrentVersion(song.id);
        return reply.send(toEditorStateDto(song, version));
      } catch (error) {
        return sendAppError(reply, error);
      }
    },
  );

  app.get<{ Params: { songId: string } }>(
    "/api/music/songs/:songId/audio/original",
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const { buffer, contentType } = await getSongOriginalAudio(
          request.userId!,
          request.params.songId,
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

  app.get<{ Params: { songId: string; stemType: string } }>(
    "/api/music/songs/:songId/stems/:stemType/audio",
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const { buffer, contentType } = await getSongStemAudio(
          request.userId!,
          request.params.songId,
          request.params.stemType,
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

  app.get<{ Params: { songId: string; versionId: string } }>(
    "/api/music/songs/:songId/versions/:versionId/audio",
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const { buffer, contentType } = await getSongVersionAudio(
          request.userId!,
          request.params.songId,
          request.params.versionId,
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
}
