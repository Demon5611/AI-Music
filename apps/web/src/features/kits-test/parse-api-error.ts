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
  const message = body.error ?? body.details ?? "";

  if (
    body.code === FREE_TIER_CODE ||
    message.toLowerCase().includes("free tier")
  ) {
    return "Нужен платный план Kits для API";
  }

  if (status === 403) {
    return "Доступ к ресурсу Kits запрещён. Проверьте ID модели и аккаунт API key.";
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
