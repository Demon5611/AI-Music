# Music generation queue — load control

Source of truth for agents and operators: how music generation throughput is shaped, monitored, and tuned.

## Architecture (two queues)

```txt
User → API (enqueue BullMQ) → Worker (submit Suno POST) → Suno (async generation)
                ↑                           ↑
         plan priority              Redis rate limiter
         backpressure 503           18 req / 10s per API key
```

1. **BullMQ `provider-jobs`** — our queue; Studio/Pro/Free priority (1 / 5 / 10).
2. **Suno internal queue** — shared for one `SUNO_API_KEY`; no per-user priority API.

## Structured logs

All load events emit **one JSON line** per event:

```json
{"scope":"load-control","event":"queue_metrics","ts":"...","waiting":12,...}
```

**Grep in prod/dev:**

```bash
rg '"scope":"load-control"' logs/
# or live:
pnpm dev:worker 2>&1 | rg 'load-control'
pnpm dev:api 2>&1 | rg 'load-control'
```

### Events

| event | source | meaning |
|-------|--------|---------|
| `queue_metrics` | api, worker | Periodic or on-demand BullMQ counts |
| `queue_enqueue` | api | Job added to BullMQ |
| `queue_backpressure` | api | Rejected: waiting >= 80 |
| `provider_job_lifecycle` | worker | start / done / failed + waitMs, durationMs |
| `suno_rate_limit_acquire` | ai-providers | Waited for Redis/memory slot (only if waitedMs > 0) |
| `suno_rate_limit_timeout` | ai-providers | Could not acquire slot within max wait |
| `suno_submit` | ai-providers, worker | Suno task created (taskId) |
| `suno_rate_limit_retry` | ai-providers | HTTP 405/430 retry |
| `suno_callback_sync` | api | Webhook updated DB |

**Warn level:** `queue_metrics` when `waiting >= 50`; `queue_backpressure` always warn.

## HTTP observability

```bash
curl -s http://localhost:3001/api/music/ops/status | jq
```

Returns `providerQueue`: `{ waiting, active, failed, delayed, estimatedSubmitWaitSec }`.

User-facing status includes `queuePhase` (`queued` | `submitted` | `processing` | …) and `queueEtaSec` while in our queue.

## Env knobs (agent tuning)

| Variable | Default | Effect |
|----------|---------|--------|
| `REDIS_URL` | localhost | **Required in prod** for shared Suno rate limit across API + workers |
| `WORKER_PROVIDER_CONCURRENCY` | 4 | Parallel BullMQ jobs per worker process |
| `SUNO_RATE_LIMIT_MAX` | 18 | Max Suno POST / window (Suno doc: 20/10s) |
| `SUNO_RATE_LIMIT_WINDOW_MS` | 10000 | Sliding window |
| `SUNO_RATE_LIMIT_MAX_WAIT_MS` | 120000 | Max wait before limiter timeout |
| `LOAD_CONTROL_METRICS_INTERVAL_MS` | 60000 | API periodic `queue_metrics`; `0` = off |
| `SUNO_CALLBACK_URL` | local | Public HTTPS in prod for faster completion sync |

Constants in code: `packages/shared/src/load-control/constants.ts`.

## Thresholds

| Constant | Value | Behavior |
|----------|-------|----------|
| `PROVIDER_QUEUE_ALERT_THRESHOLD` | 50 | `queue_metrics` logged as **warn** |
| `PROVIDER_QUEUE_BACKPRESSURE_THRESHOLD` | 80 | API **503** + `retryAfterSec` before credits spend |

## Scaling checklist (agent)

1. **Redis running** — same URL for API and all workers.
2. **One or more workers** — `pnpm dev:worker` (separate processes for horizontal scale).
3. Watch `queue_metrics`: sustained `waiting > 50` → add worker replicas; `suno_rate_limit_retry` spikes → do not raise concurrency without raising `SUNO_RATE_LIMIT_MAX` (Suno cap).
4. **Do not** set `WORKER_PROVIDER_CONCURRENCY` high without Redis limiter — risk 405 and failed jobs.
5. Phase 5 (100+ sustained): multiple Suno API keys — not implemented; see plan phase 5.

## Key files (do not duplicate logic)

| Area | Path |
|------|------|
| Log helper | `packages/shared/src/load-control/log-event.ts` |
| Thresholds | `packages/shared/src/load-control/constants.ts` |
| BullMQ enqueue + log | `apps/api/src/modules/queue/provider-job-queue.ts` |
| Metrics + backpressure | `apps/api/src/modules/queue/provider-queue-metrics.ts` |
| API polling | `apps/api/src/modules/queue/load-control-metrics-polling.ts` |
| Suno rate limiter | `packages/ai-providers/.../suno-rate-limiter.ts` |
| Suno client submit/retry | `packages/ai-providers/.../suno-api.client.ts` |
| Worker lifecycle log | `apps/worker/src/provider-job.worker.ts` |
| Webhook sync log | `apps/api/src/modules/music/suno-callback.service.ts` |
| Plan priority | `packages/shared/src/entitlements/index.ts` (`QUEUE_PRIORITY_BY_PLAN`) |

## Related docs

- [sunoapi.md](../.cursor/skills/music-provider-integration/references/sunoapi.md) — Suno API constraints
- Queue acceleration plan (historical) — `.cursor/plans/queue_throughput_acceleration_*.plan.md`
