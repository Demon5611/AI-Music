import { randomUUID } from "node:crypto";
import { Redis } from "ioredis";

export interface SunoRateLimiterConfig {
  redisUrl: string | null;
  maxRequests: number;
  windowMs: number;
  maxWaitMs: number;
}

const REDIS_KEY = "suno:submit:sliding-window";

const ACQUIRE_SLOT_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]

redis.call("ZREMRANGEBYSCORE", key, 0, now - window)
local count = redis.call("ZCARD", key)

if count < limit then
  redis.call("ZADD", key, now, member)
  redis.call("PEXPIRE", key, window + 1000)
  return 0
end

local oldest = redis.call("ZRANGE", key, 0, 0, "WITHSCORES")
if oldest[2] then
  return math.ceil(tonumber(oldest[2]) + window - now)
end

return window
`;

export function resolveSunoRateLimiterConfig(
  env: NodeJS.ProcessEnv = process.env,
): SunoRateLimiterConfig {
  return {
    redisUrl: env.REDIS_URL?.trim() || null,
    maxRequests: Number(env.SUNO_RATE_LIMIT_MAX ?? 18),
    windowMs: Number(env.SUNO_RATE_LIMIT_WINDOW_MS ?? 10_000),
    maxWaitMs: Number(env.SUNO_RATE_LIMIT_MAX_WAIT_MS ?? 120_000),
  };
}

export interface SunoRateLimiter {
  acquire(): Promise<void>;
}

class InMemorySunoRateLimiter implements SunoRateLimiter {
  private readonly timestamps: number[] = [];

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
    private readonly maxWaitMs: number,
  ) {}

  async acquire(): Promise<void> {
    const deadline = Date.now() + this.maxWaitMs;

    while (Date.now() < deadline) {
      const now = Date.now();
      this.prune(now);

      if (this.timestamps.length < this.maxRequests) {
        this.timestamps.push(now);
        return;
      }

      const oldest = this.timestamps[0] ?? now;
      const waitMs = Math.max(1, oldest + this.windowMs - now);
      await sleep(waitMs + jitterMs());
    }

    throw new Error("Suno rate limiter wait timeout");
  }

  private prune(now: number): void {
    const cutoff = now - this.windowMs;
    while (this.timestamps.length > 0 && this.timestamps[0]! < cutoff) {
      this.timestamps.shift();
    }
  }
}

class RedisSunoRateLimiter implements SunoRateLimiter {
  private readonly redis: Redis;

  constructor(
    redisUrl: string,
    private readonly maxRequests: number,
    private readonly windowMs: number,
    private readonly maxWaitMs: number,
  ) {
    this.redis = new Redis(redisUrl, { maxRetriesPerRequest: null });
  }

  async acquire(): Promise<void> {
    const deadline = Date.now() + this.maxWaitMs;

    while (Date.now() < deadline) {
      const waitMs = await this.tryAcquireSlot();
      if (waitMs === 0) {
        return;
      }

      const cappedWait = Math.min(waitMs, deadline - Date.now());
      if (cappedWait <= 0) {
        break;
      }

      await sleep(cappedWait + jitterMs());
    }

    throw new Error("Suno rate limiter wait timeout");
  }

  private async tryAcquireSlot(): Promise<number> {
    const result = await this.redis.eval(
      ACQUIRE_SLOT_SCRIPT,
      1,
      REDIS_KEY,
      String(Date.now()),
      String(this.windowMs),
      String(this.maxRequests),
      randomUUID(),
    );

    return Number(result);
  }
}

let limiterInstance: SunoRateLimiter | null = null;

export function createSunoRateLimiter(
  config: SunoRateLimiterConfig = resolveSunoRateLimiterConfig(),
): SunoRateLimiter {
  if (config.redisUrl) {
    return new RedisSunoRateLimiter(
      config.redisUrl,
      config.maxRequests,
      config.windowMs,
      config.maxWaitMs,
    );
  }

  return new InMemorySunoRateLimiter(
    config.maxRequests,
    config.windowMs,
    config.maxWaitMs,
  );
}

export function getSunoRateLimiter(): SunoRateLimiter {
  if (!limiterInstance) {
    limiterInstance = createSunoRateLimiter();
  }

  return limiterInstance;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function jitterMs(): number {
  return Math.floor(Math.random() * 150);
}
