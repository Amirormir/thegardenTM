import type { ChampionStats } from '@nexus/draft-engine';
import {
  getChampionStats,
  getSeasonIdForDraft,
  invalidateChampionStats,
} from './champion-stats.js';
import { createDraftController } from './draft-controller.js';
import { env } from './env.js';
import { logger } from './logger.js';
import { closeRedis } from './redis.js';
import { createSocketServer } from './socket-server.js';
import { startTimerWorker, timerQueue } from './timer-queue.js';

function room(draftId: string): string {
  return `draft:${draftId}`;
}

async function main(): Promise<void> {
  let io: ReturnType<typeof createSocketServer>['io'] | null = null;

  const controller = createDraftController({
    onAction: async (state, action) => {
      if (!io) return;
      let championStats: ChampionStats | undefined;
      if (action.type === 'PICK' && action.championId) {
        try {
          const seasonId = await getSeasonIdForDraft(state.draftId);
          if (seasonId) {
            // Recompute after persistLockedAction so the broadcast reflects the
            // freshly-locked pick (pickCount ≥ 1, presenceRate updated).
            await invalidateChampionStats(seasonId, action.championId);
            championStats = await getChampionStats(seasonId, action.championId);
          }
        } catch (err) {
          logger.warn({ err, draftId: state.draftId }, 'championStats compute failed');
        }
      }
      io.to(room(state.draftId)).emit('draft:action_locked', {
        draftId: state.draftId,
        action,
        state,
        ...(championStats ? { championStats } : {}),
      });
    },
    onCompleted: (state) => {
      if (!io) return;
      io.to(room(state.draftId)).emit('draft:completed', {
        draftId: state.draftId,
        state,
      });
    },
    onTimer: (state) => {
      if (!io || !state.timerDeadline) return;
      io.to(room(state.draftId)).emit('draft:timer', {
        draftId: state.draftId,
        step: state.currentStep,
        deadline: state.timerDeadline,
      });
    },
    onStarted: (state) => {
      if (!io) return;
      io.to(room(state.draftId)).emit('draft:state', { state });
    },
    onPaused: (state) => {
      if (!io) return;
      io.to(room(state.draftId)).emit('draft:paused', { draftId: state.draftId });
    },
    onResumed: (state) => {
      if (!io) return;
      io.to(room(state.draftId)).emit('draft:resumed', { state });
    },
    onCancelled: (state) => {
      if (!io) return;
      io.to(room(state.draftId)).emit('draft:cancelled', { draftId: state.draftId });
    },
  });

  const server = createSocketServer({ controller });
  io = server.io;

  const worker = startTimerWorker(async ({ draftId, step, version }) => {
    await controller.handleTimeout({ draftId, step, expectedVersion: version });
  });

  server.http.listen(env.port, () => {
    logger.info({ port: env.port, origin: env.webOrigin }, 'realtime server listening');
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down');
    server.http.close();
    await io?.close();
    await worker.close();
    await timerQueue.close();
    await closeRedis();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, 'realtime server failed to start');
  process.exit(1);
});
