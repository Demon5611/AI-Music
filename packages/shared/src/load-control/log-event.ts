import { LOAD_CONTROL_LOG_SCOPE } from "./constants.js";

export type LoadControlEvent =
  | "queue_metrics"
  | "queue_enqueue"
  | "queue_backpressure"
  | "provider_job_lifecycle"
  | "suno_rate_limit_acquire"
  | "suno_rate_limit_timeout"
  | "suno_submit"
  | "suno_rate_limit_retry"
  | "suno_callback_sync";

export type LoadControlLevel = "info" | "warn" | "error";

export type LoadControlFields = Record<
  string,
  string | number | boolean | null | undefined
>;

/**
 * Structured load-control log (JSON line). Grep: `scope":"load-control"`.
 * Agent playbook: docs/music-generation-queue-load-control.md
 */
export function logLoadControl(
  event: LoadControlEvent,
  fields: LoadControlFields,
  level: LoadControlLevel = "info",
): void {
  const payload = {
    scope: LOAD_CONTROL_LOG_SCOPE,
    event,
    ts: new Date().toISOString(),
    ...fields,
  };

  const line = JSON.stringify(payload);

  if (level === "warn") {
    console.warn(line);
    return;
  }

  if (level === "error") {
    console.error(line);
    return;
  }

  console.info(line);
}
