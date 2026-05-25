import { prisma } from "@ai-music/db";
import type { GenerationJobPayload, GenerationStatus } from "@ai-music/shared";

const PIPELINE_STUB_MESSAGE =
  "AI pipeline is not configured yet (ElevenLabs + Kits)";

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
  });

  if (!job || job.status === "completed" || job.status === "failed") {
    return;
  }

  await updateJobStatus(payload.jobId, "preprocessing_voice");

  try {
    await updateJobStatus(payload.jobId, "generating_song");
    throw new Error(PIPELINE_STUB_MESSAGE);
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
