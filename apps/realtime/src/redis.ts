import { Redis } from 'ioredis';
import { env } from './env.js';
import { logger } from './logger.js';

/**
 * Single Redis connection shared by the realtime app.
 *
 * BullMQ needs `maxRetriesPerRequest: null` to support blocking commands.
 * Connection url is `rediss://default:<UPSTASH_TOKEN>@<HOST>:<PORT>` for Upstash.
 */
function createConnection(label: string): Redis {
  const conn = new Redis(env.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  conn.on('error', (err) => {
    logger.error({ err, label }, 'redis error');
  });

  conn.on('connect', () => {
    logger.info({ label }, 'redis connected');
  });

  return conn;
}

/** Shared connection for normal commands (read/write hashes, transactions). */
export const redis = createConnection('main');

/** Dedicated connection for BullMQ (blocking commands). */
export const bullConnection = createConnection('bullmq');

export async function closeRedis(): Promise<void> {
  await Promise.allSettled([redis.quit(), bullConnection.quit()]);
}
