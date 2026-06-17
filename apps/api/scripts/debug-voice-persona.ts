import { prisma } from "@ai-music/db";
import { findReadySunoVoiceSample } from "../src/modules/voice-samples/resolve-suno-voice-persona.js";

const userId = process.argv[2] ?? "user_3EEJv5yYqI2tyfRX7V57lm3CXF1";
const taskId = process.argv[3] ?? "4707d2d209a281ae74ff61444f046652";

async function main() {
  const samples = await prisma.voiceSample.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      voiceCloneStatus: true,
      sunoVoiceId: true,
      sunoVoiceTaskId: true,
      durationSec: true,
      status: true,
    },
  });

  const resolved = await findReadySunoVoiceSample(userId);
  const gen = await prisma.musicGeneration.findFirst({
    where: { providerTaskId: taskId },
    include: {
      tracks: { select: { id: true, title: true, providerTrackId: true } },
    },
  });

  console.log(JSON.stringify({ samples, resolved, gen }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
