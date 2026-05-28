import { createKitsClient } from "../kits/create-kits-client.js";
import {
  isKitsJobFailed,
  isKitsJobSuccess,
  pollUntilComplete,
} from "../kits/poll.js";
import type { KitsClient } from "../kits/kits-client.js";
import type { KitsInferenceJob } from "../kits/types.js";
import type {
  VoiceTransferInput,
  VoiceTransferProvider,
  VoiceTransferResult,
} from "./voice-transfer.types.js";

function isVoiceTransferTerminal(job: KitsInferenceJob): boolean {
  return isKitsJobSuccess(job.status) || isKitsJobFailed(job.status);
}

export class KitsVoiceTransferProvider implements VoiceTransferProvider {
  constructor(private readonly client: KitsClient = createKitsClient()) {}

  async transferVoice(input: VoiceTransferInput): Promise<VoiceTransferResult> {
    const job = await this.client.createVoiceConversion({
      voiceModelId: input.voiceModelId,
      soundFile: Uint8Array.from(input.vocalAudioBuffer),
      filename: input.filename ?? "vocal.mp3",
      mimeType: input.mimeType ?? "audio/mpeg",
    });

    const completed = await pollUntilComplete(
      () => this.client.getVoiceConversion(job.id),
      isVoiceTransferTerminal,
    );

    if (isKitsJobFailed(completed.status)) {
      throw new Error("Kits voice transfer failed");
    }

    const outputUrl = completed.outputFileUrl;

    if (!outputUrl) {
      throw new Error("Kits voice transfer completed without output URL");
    }

    const response = await fetch(outputUrl);

    if (!response.ok) {
      throw new Error(`Failed to download Kits output: HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    return {
      audioBuffer: Buffer.from(arrayBuffer),
      providerJobId: String(job.id),
    };
  }
}

export function createKitsVoiceTransferProvider(): KitsVoiceTransferProvider {
  return new KitsVoiceTransferProvider();
}
