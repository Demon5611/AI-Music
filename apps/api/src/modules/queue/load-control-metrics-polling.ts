import { logProviderQueueMetrics } from "../queue/provider-queue-metrics.js";

const DEFAULT_INTERVAL_MS = 60_000;

let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Periodic queue metrics for API process. Disable with LOAD_CONTROL_METRICS_INTERVAL_MS=0.
 * @see docs/music-generation-queue-load-control.md
 */
export function startLoadControlMetricsPolling(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const intervalMs = Number(env.LOAD_CONTROL_METRICS_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);

  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    return;
  }

  void logProviderQueueMetrics("api");

  timer = setInterval(() => {
    void logProviderQueueMetrics("api");
  }, intervalMs);
}

export function stopLoadControlMetricsPolling(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
