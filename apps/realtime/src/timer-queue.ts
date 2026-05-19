import { Queue, Worker, type Job } from 'bullmq';
import { bullConnection } from './redis.js';
import { logger } from './logger.js';

export interface TimerJobData {
  draftId: string;
  step: number;
  version: number;
}

const QUEUE_NAME = 'draft-timers';

export const timerQueue = new Queue<TimerJobData>(QUEUE_NAME, {
  connection: bullConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 500 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
  },
});

function jobId(draftId: string, step: number): string {
  return `${draftId}__${step}`;
}

/**
 * Schedule the timeout for a step. If a previous job for the same step is still
 * queued, it is replaced.
 */
export async function scheduleStepTimeout(
  data: TimerJobData,
  delayMs: number,
): Promise<void> {
  const id = jobId(data.draftId, data.step);
  await timerQueue.remove(id).catch(() => undefined);
  await timerQueue.add('timeout', data, { jobId: id, delay: Math.max(0, delayMs) });
}

export async function cancelStepTimeout(draftId: string, step: number): Promise<void> {
  await timerQueue.remove(jobId(draftId, step)).catch(() => undefined);
}

export async function cancelAllStepTimeouts(draftId: string): Promise<void> {
  // Best-effort: remove all known steps.
  for (let step = 1; step <= 20; step += 1) {
    await timerQueue.remove(jobId(draftId, step)).catch(() => undefined);
  }
}

export interface TimerHandler {
  (data: TimerJobData): Promise<void>;
}

export function startTimerWorker(handler: TimerHandler): Worker<TimerJobData> {
  const worker = new Worker<TimerJobData>(
    QUEUE_NAME,
    async (job: Job<TimerJobData>) => {
      await handler(job.data);
    },
    {
      connection: bullConnection,
      concurrency: 8,
    },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'timer job failed');
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'timer worker error');
  });

  return worker;
}
