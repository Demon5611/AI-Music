export interface ElevenLabsErrorBody {
  detail?: string | { msg?: string }[];
}

export class ElevenLabsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: ElevenLabsErrorBody,
  ) {
    super(message);
    this.name = "ElevenLabsApiError";
  }
}

function parseErrorMessage(body: ElevenLabsErrorBody, fallback: string): string {
  if (typeof body.detail === "string") {
    return body.detail;
  }

  if (Array.isArray(body.detail) && body.detail[0]?.msg) {
    return body.detail[0].msg;
  }

  return fallback;
}

export async function throwElevenLabsApiError(
  response: Response,
  context: string,
): Promise<never> {
  const rawBody = await response.text();
  let parsed: ElevenLabsErrorBody = {};

  try {
    parsed = JSON.parse(rawBody) as ElevenLabsErrorBody;
  } catch {
    // Non-JSON error body.
  }

  const message = parseErrorMessage(
    parsed,
    `${context}: HTTP ${response.status}`,
  );

  throw new ElevenLabsApiError(message, response.status, parsed);
}
