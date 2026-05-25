import { prisma } from "@ai-music/db";
import { uploadVoiceSampleFieldsSchema } from "@ai-music/shared";
import { ForbiddenError, NotFoundError } from "../../common/errors.js";
import {
  buildVoiceSampleKey,
  getStorageService,
  resolveVoiceSampleExtension,
} from "../storage/storage.service.js";
import { toVoiceSampleDto } from "./mapper.js";

const ALLOWED_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/flac",
]);

export interface CreateVoiceSampleInput {
  userId: string;
  filename: string;
  mimeType: string;
  fileBuffer: Buffer;
  fields: Record<string, string>;
}

export async function listVoiceSamples(userId: string) {
  const samples = await prisma.voiceSample.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return samples.map(toVoiceSampleDto);
}

export async function createVoiceSample(input: CreateVoiceSampleInput) {
  const parsedFields = uploadVoiceSampleFieldsSchema.safeParse({
    confirmed: input.fields.confirmed === "true",
    consentPhrase: input.fields.consentPhrase,
    durationSec: input.fields.durationSec,
  });

  if (!parsedFields.success) {
    throw new ForbiddenError("Voice consent is required");
  }

  if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
    throw new ForbiddenError("Unsupported audio format");
  }

  const sample = await prisma.voiceSample.create({
    data: {
      userId: input.userId,
      r2Key: "pending",
      durationSec: parsedFields.data.durationSec,
      status: "pending",
      consentConfirmed: true,
    },
  });

  const extension = resolveVoiceSampleExtension(input.filename, input.mimeType);
  const storageKey = buildVoiceSampleKey(input.userId, sample.id, extension);
  const storage = getStorageService();

  try {
    await storage.put(storageKey, input.fileBuffer, input.mimeType);

    const updated = await prisma.voiceSample.update({
      where: { id: sample.id },
      data: { r2Key: storageKey, status: "ready" },
    });

    return toVoiceSampleDto(updated);
  } catch (error) {
    await prisma.voiceSample.delete({ where: { id: sample.id } });
    throw error;
  }
}

export async function deleteVoiceSample(userId: string, sampleId: string) {
  const sample = await prisma.voiceSample.findFirst({
    where: { id: sampleId, userId },
  });

  if (!sample) {
    throw new NotFoundError("Voice sample not found");
  }

  await getStorageService().delete(sample.r2Key);
  await prisma.voiceSample.delete({ where: { id: sample.id } });
}
