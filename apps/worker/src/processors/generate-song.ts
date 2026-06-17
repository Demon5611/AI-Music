import { prisma } from "@ai-music/db";
import type { GenerationJobPayload, GenerationStatus } from "@ai-music/shared";
import { generateSongWithSunoVoice } from "./convert-voice.js";
import { preprocessVoice } from "./preprocess-voice.js";
import { uploadGenerationResult } from "./upload-result.js";

async function updateJobStatus(
  jobId: string,
  status: GenerationStatus,
  errorMessage?: string,
) {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      status,
      errorMessage: errorMessage ?? null,
    },
  });
}

async function refundGenerationCredits(
  userId: string,
  amount: number,
  jobId: string,
) {
  await prisma.creditTransaction.create({
    data: {
      userId,
      type: "refund",
      amount,
      reason: `generation_failed:${jobId}`,
    },
  });
}

export async function processGenerationJob(
  payload: GenerationJobPayload,
): Promise<void> {
  const job = await prisma.generationJob.findUnique({
    where: { id: payload.jobId },
    include: { voiceSample: true },
  });

  if (!job || job.status === "completed" || job.status === "failed") {
    return;
  }

  try {
    await updateJobStatus(payload.jobId, "preprocessing_voice");
    const { voiceSample } = await preprocessVoice(job.voiceSample);

    await updateJobStatus(payload.jobId, "generating_song");
    const resultBuffer = await generateSongWithSunoVoice(job, voiceSample);

    await updateJobStatus(payload.jobId, "uploading_result");
    await uploadGenerationResult(job, resultBuffer);

    await updateJobStatus(payload.jobId, "completed");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Generation failed";

    await updateJobStatus(payload.jobId, "failed", message);
    await refundGenerationCredits(
      payload.userId,
      job.creditsCost,
      payload.jobId,
    );
  }
}
