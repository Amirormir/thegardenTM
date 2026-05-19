import type { DraftState } from '@nexus/draft-engine';
import { redis } from './redis.js';

const STATE_TTL_SECONDS = 60 * 60 * 6; // 6h

function key(draftId: string): string {
  return `draft:${draftId}:state`;
}

function lockKey(draftId: string): string {
  return `draft:${draftId}:lock`;
}

export async function loadDraftState(draftId: string): Promise<DraftState | null> {
  const raw = await redis.get(key(draftId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DraftState;
  } catch {
    return null;
  }
}

export async function saveDraftState(state: DraftState): Promise<void> {
  await redis.set(key(state.draftId), JSON.stringify(state), 'EX', STATE_TTL_SECONDS);
}

/**
 * Optimistic concurrency: commit only if the persisted version matches `expected`.
 * Uses a Redis MULTI/EXEC with WATCH to make the read+write atomic.
 *
 * Returns true if the swap succeeded, false if the version was stale.
 */
export async function commitDraftState(state: DraftState, expectedVersion: number): Promise<boolean> {
  const k = key(state.draftId);
  await redis.watch(k);
  try {
    const existing = await redis.get(k);
    if (existing) {
      const parsed = JSON.parse(existing) as DraftState;
      if (parsed.version !== expectedVersion) {
        await redis.unwatch();
        return false;
      }
    } else if (expectedVersion !== 0) {
      await redis.unwatch();
      return false;
    }

    const result = await redis
      .multi()
      .set(k, JSON.stringify(state), 'EX', STATE_TTL_SECONDS)
      .exec();

    return result !== null;
  } catch (error) {
    await redis.unwatch();
    throw error;
  }
}

/**
 * Cooperative per-draft mutex. Holders set a key with NX+PX; callers spin briefly.
 *
 * The lock is a defence in depth — `commitDraftState` already prevents lost updates
 * via WATCH/MULTI, but the mutex serialises socket handlers so we never compute
 * a state transition against a half-updated view.
 */
export async function withDraftLock<T>(
  draftId: string,
  fn: () => Promise<T>,
  options: { ttlMs?: number; timeoutMs?: number; pollMs?: number } = {},
): Promise<T> {
  const ttl = options.ttlMs ?? 5000;
  const timeout = options.timeoutMs ?? 4000;
  const poll = options.pollMs ?? 30;
  const token = `${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const k = lockKey(draftId);
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const ok = await redis.set(k, token, 'PX', ttl, 'NX');
    if (ok === 'OK') {
      try {
        return await fn();
      } finally {
        const current = await redis.get(k);
        if (current === token) await redis.del(k);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, poll));
  }

  throw new Error(`Could not acquire draft lock for ${draftId} within ${timeout}ms`);
}

export async function deleteDraftState(draftId: string): Promise<void> {
  await redis.del(key(draftId));
}
