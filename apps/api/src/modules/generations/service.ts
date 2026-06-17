import { prisma } from "@ai-music/db";
import {
  GENERATION_CREDIT_COST,
  type CreateGenerationInput,
} from "@ai-music/shared";
import { ForbiddenError, NotFoundError } from "../../common/errors.js";
import { spendCredits, refundCredits } from "../credits/service.js";
import { enqueueGenerationJob } from "../queue/generation-queue.js";
import { toGenerationJobDto } from "./mapper.js";

export async function createGenerationJob(
  userId: string,
  input: CreateGenerationInput,
) {
  const voiceSample = await prisma.voiceSample.findFirst({
    where: { id: input.voiceSampleId, userId },
  });

  if (!voiceSample) {
    throw new NotFoundError("Voice sample not found");
  }

  if (!voiceSample.consentConfirmed || voiceSample.status !== "ready") {
    throw new ForbiddenError("Voice sample is not ready");
  }

  if (!voiceSample.sunoVoiceId || voiceSample.voiceCloneStatus !== "ready") {
    throw new ForbiddenError("Suno voice is not ready");
  }

  await spendCredits(userId, GENERATION_CREDIT_COST, "generation_start");

  const job = await prisma.generationJob.create({
    data: {
      userId,
      voiceSampleId: voiceSample.id,
      prompt: input.prompt,
      style: input.style,
      durationSec: input.duration,
      status: "pending",
      creditsCost: GENERATION_CREDIT_COST,
    },
  });

  try {
    await enqueueGenerationJob({
      jobId: job.id,
      userId,
      voiceSampleId: voiceSample.id,
    });
  } catch (error) {
    await prisma.generationJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        errorMessage: "Failed to enqueue generation job",
      },
    });
    await refundCredits(
      userId,
      GENERATION_CREDIT_COST,
      `enqueue_failed:${job.id}`,
    );
    throw error;
  }

  return { jobId: job.id };
}

export async function getGenerationJob(userId: string, jobId: string) {
  const job = await prisma.generationJob.findFirst({
    where: { id: jobId, userId },
  });

  if (!job) {
    throw new NotFoundError("Generation job not found");
  }

  return toGenerationJobDto(job);
}

export async function getGenerationJobStatus(userId: string, jobId: string) {
  const job = await prisma.generationJob.findFirst({
    where: { id: jobId, userId },
    select: { status: true },
  });

  if (!job) {
    throw new NotFoundError("Generation job not found");
  }

  return { status: job.status };
}
