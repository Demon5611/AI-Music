import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance, FastifyRequest } from "fastify";

const ONE_MINUTE_MS = 60_000;

export const RATE_LIMITS = {
  voicePrepare: { max: 6, timeWindowMs: ONE_MINUTE_MS },
  voiceVerify: { max: 5, timeWindowMs: ONE_MINUTE_MS },
  musicGenerate: { max: 10, timeWindowMs: ONE_MINUTE_MS },
} as const;

function resolveRateLimitKey(request: FastifyRequest): string {
  return request.userId ?? request.ip;
}

export function userRateLimitRouteConfig(
  max: number,
  timeWindowMs: number,
): { rateLimit: { max: number; timeWindow: number; keyGenerator: typeof resolveRateLimitKey } } {
  return {
    rateLimit: {
      max,
      timeWindow: timeWindowMs,
      keyGenerator: resolveRateLimitKey,
    },
  };
}

export async function registerRateLimitPlugin(app: FastifyInstance) {
  await app.register(rateLimit, {
    global: false,
    hook: "preHandler",
  });
}
