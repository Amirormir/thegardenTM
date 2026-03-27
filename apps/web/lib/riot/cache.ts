import { Redis } from '@upstash/redis';
import { RiotApiError } from './client';

interface CacheEnvelope<T> {
  data: T;
  updatedAt: string;
}

export interface RiotCacheResult<T> {
  data: T;
  cached: boolean;
  stale: boolean;
  updatedAt: string;
}

let redisClient: Redis | null | undefined;

function getRedisClient() {
  if (redisClient !== undefined) {
    return redisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

function shouldUseFallback(error: unknown) {
  return (
    error instanceof RiotApiError &&
    (error.status === 429 || error.status === 403 || error.status >= 500)
  );
}

export function buildRiotCacheKey(scope: string, identifier: string) {
  return `riot:${scope}:${identifier}`;
}

export async function getCachedRiotValue<T>(key: string) {
  const client = getRedisClient();

  if (!client) {
    return null;
  }

  return client.get<CacheEnvelope<T>>(key);
}

export async function setCachedRiotValue<T>(key: string, data: T, freshTtlSeconds: number) {
  const client = getRedisClient();

  if (!client) {
    return;
  }

  const extendedTtl = Math.max(freshTtlSeconds * 24, freshTtlSeconds + 3600);

  await client.set(
    key,
    {
      data,
      updatedAt: new Date().toISOString(),
    } satisfies CacheEnvelope<T>,
    {
      ex: extendedTtl,
    },
  );
}

export async function fetchWithRiotCache<T>(options: {
  key: string;
  freshTtlSeconds: number;
  request: () => Promise<T>;
}): Promise<RiotCacheResult<T>> {
  const cached = await getCachedRiotValue<T>(options.key);

  if (cached) {
    const ageInSeconds = Math.floor(
      (Date.now() - new Date(cached.updatedAt).getTime()) / 1000,
    );

    if (ageInSeconds <= options.freshTtlSeconds) {
      return {
        data: cached.data,
        cached: true,
        stale: false,
        updatedAt: cached.updatedAt,
      };
    }
  }

  try {
    const data = await options.request();
    await setCachedRiotValue(options.key, data, options.freshTtlSeconds);

    return {
      data,
      cached: false,
      stale: false,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (cached && shouldUseFallback(error)) {
      return {
        data: cached.data,
        cached: true,
        stale: true,
        updatedAt: cached.updatedAt,
      };
    }

    throw error;
  }
}
