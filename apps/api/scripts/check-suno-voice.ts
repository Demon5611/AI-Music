import { config } from "dotenv";
import { resolve } from "node:path";
import { createSunoVoiceClients } from "@ai-music/ai-providers";

config({ path: resolve(import.meta.dirname, "../../../.env") });

const voiceId = process.argv[2] ?? "de2972fff33f008ea03a058b21bc6fdb";

async function main() {
  const { voice } = createSunoVoiceClients();
  const available = await voice.checkVoiceAvailability(voiceId);
  const record = await voice.getVoiceRecordInfo(voiceId);

  console.log(JSON.stringify({ voiceId, available, record }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
