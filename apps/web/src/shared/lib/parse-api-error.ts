import { ApiError } from "@ai-music/api-client";

export interface ParseApiErrorOptions {
  includeUnauthorized?: boolean;
  includeServerHint?: boolean;
}

export function parseApiError(
  error: unknown,
  fallback: string,
  options: ParseApiErrorOptions = {},
): string {
  const { includeUnauthorized = false, includeServerHint = false } = options;

  if (error instanceof ApiError && error.body && typeof error.body === "object") {
    const body = error.body as { error?: string; code?: string };

    if (body.code === "INSUFFICIENT_CREDITS") {
      return "Недостаточно credits. Пополните баланс на странице тарифов.";
    }

    if (body.code === "FEATURE_NOT_AVAILABLE") {
      return body.error ?? "Функция недоступна на вашем тарифе. Перейдите на страницу тарифов.";
    }

    if (body.code === "DURATION_LIMIT_EXCEEDED") {
      return body.error ?? "Превышен лимит длительности трека для вашего тарифа.";
    }

    if (body.code === "EDITOR_OPERATION_NOT_ALLOWED") {
      return body.error ?? "Эта операция редактора доступна на более высоком тарифе.";
    }

    if (body.error) {
      return body.error;
    }
  }

  if (includeUnauthorized && error instanceof ApiError && error.status === 401) {
    return "Unauthorized";
  }

  if (includeServerHint && error instanceof ApiError && error.status >= 500) {
    return `${error.status} — проверьте, что запущены Docker, API и выполнен pnpm db:push`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export const resolveErrorMessage = parseApiError;
