interface KitsApiErrorResponse {
  error?: string;
  code?: string;
  details?: string;
}

const FREE_TIER_CODE = "E_FORBIDDEN_EXCEPTION";

export function parseKitsApiError(
  body: KitsApiErrorResponse,
  status: number,
): string {
  if (status === 403 || body.code === FREE_TIER_CODE) {
    return "Нужен платный план Kits для API";
  }

  if (body.error) {
    return body.error;
  }

  return `Ошибка запроса (HTTP ${status})`;
}

export async function readKitsApiError(response: Response): Promise<string> {
  let body: KitsApiErrorResponse = {};

  try {
    body = (await response.json()) as KitsApiErrorResponse;
  } catch {
    body = {};
  }

  return parseKitsApiError(body, response.status);
}
