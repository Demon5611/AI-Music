import { config } from "dotenv";
import { resolve } from "node:path";
import { prisma } from "@ai-music/db";
import { createSunoVoiceClients } from "@ai-music/ai-providers";
import { resolvePersonaVoiceId } from "../src/modules/voice-samples/persona-voice-id.service.js";
import { findReadySunoVoiceSample } from "../src/modules/voice-samples/resolve-suno-voice-persona.js";

config({ path: resolve(import.meta.dirname, "../../../.env") });

const userId = process.argv[2] ?? "user_3EEJv5yYqI2tyfRX7V57lm3CXF1";

async function main() {
  const samples = await prisma.voiceSample.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const { voice } = createSunoVoiceClients();
  const resolved = await findReadySunoVoiceSample(userId);

  const diagnostics = await Promise.all(
    samples.map(async (sample) => {
      const taskId = sample.sunoVoiceTaskId?.trim();
      let record = null;

      if (taskId) {
        try {
          record = await voice.getVoiceRecordInfo(taskId);
        } catch (error) {
          record = {
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }

      const personaId = await resolvePersonaVoiceId(sample);

      return {
        id: sample.id,
        voiceCloneStatus: sample.voiceCloneStatus,
        sunoVoiceId: sample.sunoVoiceId,
        sunoVoiceTaskId: sample.sunoVoiceTaskId,
        record,
        voiceIdEqualsTaskId:
          record &&
          typeof record === "object" &&
          "voiceId" in record &&
          "taskId" in record
            ? record.voiceId === record.taskId
            : null,
        resolvedPersonaId: personaId,
      };
    }),
  );

  console.log(JSON.stringify({ userId, resolved, diagnostics }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
