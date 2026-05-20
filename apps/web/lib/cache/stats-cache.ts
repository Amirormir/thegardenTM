import { Redis } from '@upstash/redis';

interface StatsCacheEnvelope<T> {
  data: T;
  updatedAt: string;
}

let redisClient: Redis | null | undefined;

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisClient = null;
    return redisClient;
  }
  redisClient = new Redis({ url, token });
  return redisClient;
}

export function buildStatsCacheKey(scope: string, ...parts: (string | number | undefined)[]) {
  const tail = parts.filter((p) => p !== undefined && p !== '').join(':');
  return tail ? `stats:${scope}:${tail}` : `stats:${scope}`;
}

export async function withStatsCache<T>(options: {
  key: string;
  ttlSeconds: number;
  compute: () => Promise<T>;
}): Promise<T> {
  const client = getRedisClient();
  if (!client) return options.compute();

  try {
    const cached = await client.get<StatsCacheEnvelope<T>>(options.key);
    if (cached) return cached.data;
  } catch {
    // Cache read failure must not break the request — fall through to compute.
  }

  const data = await options.compute();

  try {
    await client.set(
      options.key,
      { data, updatedAt: new Date().toISOString() } satisfies StatsCacheEnvelope<T>,
      { ex: options.ttlSeconds },
    );
  } catch {
    // Cache write failure is non-fatal.
  }

  return data;
}
