import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

// In-memory fallback map for local development or when Redis is not yet provisioned
const memoryStore = new Map<string, { count: number; resetAt: number }>();

function inMemoryLimit(identifier: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = memoryStore.get(identifier);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, reset: now + windowMs };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, reset: entry.resetAt };
  }

  entry.count += 1;
  return { success: true, remaining: limit - entry.count, reset: entry.resetAt };
}

let redis: Redis | null = null;
if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
  } catch (err) {
    console.warn("Failed to initialize Upstash Redis, falling back to memory:", err);
  }
}

// 30 messages per minute for chat
export const chatRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "1 m"),
      analytics: true,
      prefix: "ratelimit:chat",
    })
  : null;

// 20 code runs per minute, 200 per day
export const runRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "1 m"),
      analytics: true,
      prefix: "ratelimit:run",
    })
  : null;

// AI code actions rate limiter: 30 requests per minute
export const actionRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "1 m"),
      analytics: true,
      prefix: "ratelimit:action",
    })
  : null;

export async function checkRateLimit(
  type: "chat" | "run" | "action",
  identifier: string
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const limiter =
    type === "chat" ? chatRateLimiter : type === "run" ? runRateLimiter : actionRateLimiter;

  if (limiter) {
    try {
      const res = await limiter.limit(identifier);
      return { success: res.success, remaining: res.remaining, reset: res.reset };
    } catch (err) {
      console.warn("Upstash limit check failed, falling back to memory:", err);
    }
  }

  // Fallbacks:
  if (type === "chat") {
    return inMemoryLimit(`chat:${identifier}`, 30, 60 * 1000);
  } else if (type === "run") {
    return inMemoryLimit(`run:${identifier}`, 20, 60 * 1000);
  } else {
    return inMemoryLimit(`action:${identifier}`, 30, 60 * 1000);
  }
}
