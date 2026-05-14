import { Redis } from '@upstash/redis';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

let cachedClient: Redis | null | undefined;

function getRedis(): Redis | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = new Redis({ url, token });
  return cachedClient;
}

export interface RateLimitOptions {
  identifier: string;
  scope: string;
  limit: number;
  windowSeconds: number;
}

export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const { identifier, scope, limit, windowSeconds } = options;
  const redis = getRedis();

  if (!redis) {
    return {
      allowed: true,
      remaining: limit,
      resetAt: Date.now() + windowSeconds * 1000,
      limit,
    };
  }

  const key = `ratelimit:${scope}:${identifier}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }

  const ttl = await redis.ttl(key);
  const resetAt = Date.now() + (ttl > 0 ? ttl : windowSeconds) * 1000;
  const allowed = count <= limit;

  return {
    allowed,
    remaining: Math.max(0, limit - count),
    resetAt,
    limit,
  };
}

export function buildRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
  };
}
