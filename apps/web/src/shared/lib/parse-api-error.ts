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
    const body = error.body as { error?: string };
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
