interface ElevenLabsApiErrorResponse {
  error?: string;
  details?: unknown;
}

export async function readElevenLabsApiError(
  response: Response,
): Promise<string> {
  let body: ElevenLabsApiErrorResponse = {};

  try {
    body = (await response.json()) as ElevenLabsApiErrorResponse;
  } catch {
    // Non-JSON error body.
  }

  if (body.error) {
    return body.error;
  }

  return `ElevenLabs API error: HTTP ${response.status}`;
}

export function readResponseMeta(
  response: Response,
): Record<string, string> {
  return {
    kind: response.headers.get("X-ElevenLabs-Test-Kind") ?? "unknown",
    byteLength: response.headers.get("X-Audio-Byte-Length") ?? "0",
    providerJobId: response.headers.get("X-Provider-Job-Id") ?? "",
  };
}
