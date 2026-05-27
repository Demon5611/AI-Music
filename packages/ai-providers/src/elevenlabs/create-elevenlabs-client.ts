import { ElevenLabsClient } from "./elevenlabs-client.js";

export interface ElevenLabsClientConfig {
  baseUrl?: string;
  apiKey?: string;
}

export function createElevenLabsClient(
  config: ElevenLabsClientConfig = {},
): ElevenLabsClient {
  const baseUrl =
    config.baseUrl ??
    process.env.ELEVENLABS_API_BASE_URL ??
    "https://api.elevenlabs.io";
  const apiKey = config.apiKey ?? process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is required");
  }

  return new ElevenLabsClient(baseUrl.replace(/\/$/, ""), apiKey);
}
