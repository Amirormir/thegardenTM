import { prisma, type Prisma } from '@nexus/db';
import {
  createInitialState,
  type DraftState,
  type LockedAction,
} from '@nexus/draft-engine';
import { logger } from './logger.js';

/**
 * Compute fearless-locked champion ids for a given draft: every PICK locked in
 * previous non-cancelled drafts of the same match (game numbers < current).
 */
export async function fetchFearlessLocks(draftId: string): Promise<string[]> {
  const draft = await prisma.draft.findUnique({
    where: { id: draftId },
    select: { matchId: true, gameNumber: true, fearless: true },
  });

  if (!draft || !draft.fearless) return [];

  const previous = await prisma.draft.findMany({
    where: {
      matchId: draft.matchId,
      gameNumber: { lt: draft.gameNumber },
      status: { in: ['COMPLETED', 'IN_PROGRESS', 'PAUSED'] },
    },
    select: {
      actions: {
        where: { type: 'PICK', NOT: { championId: null } },
        select: { championId: true },
      },
    },
  });

  const set = new Set<string>();
  for (const d of previous) {
    for (const a of d.actions) {
      if (a.championId) set.add(a.championId);
    }
  }
  return Array.from(set);
}

/**
 * Build an in-memory engine state from the DB. Used on first hydration.
 */
export async function hydrateStateFromDatabase(draftId: string): Promise<DraftState | null> {
  const draft = await prisma.draft.findUnique({
    where: { id: draftId },
    select: {
      id: true,
      status: true,
      currentStep: true,
      startedAt: true,
      completedAt: true,
      actions: {
        orderBy: { step: 'asc' },
        select: {
          step: true,
          type: true,
          side: true,
          championId: true,
          wasAutoPicked: true,
          lockedAt: true,
        },
      },
    },
  });

  if (!draft) return null;

  const fearless = await fetchFearlessLocks(draftId);
  const base = createInitialState({
    draftId: draft.id,
    fearlessLockedChampionIds: fearless,
  });

  const actions: LockedAction[] = draft.actions.map((a) => ({
    step: a.step,
    type: a.type,
    side: a.side,
    championId: a.championId,
    wasAutoPicked: a.wasAutoPicked,
    lockedAt: a.lockedAt.getTime(),
  }));

  return {
    ...base,
    status: draft.status,
    currentStep: draft.currentStep,
    actions,
    startedAt: draft.startedAt?.getTime() ?? null,
    completedAt: draft.completedAt?.getTime() ?? null,
    timerDeadline: null,
    version: actions.length,
  };
}

/**
 * Persist a single locked action to Postgres. Idempotent via the unique [draftId, step] constraint.
 */
export async function persistLockedAction(
  draftId: string,
  action: LockedAction,
  nextStep: number,
  status: 'IN_PROGRESS' | 'COMPLETED',
  startedAt: number | null,
  completedAt: number | null,
): Promise<void> {
  try {
    await prisma.$transaction([
      prisma.draftAction.create({
        data: {
          draftId,
          step: action.step,
          type: action.type,
          side: action.side,
          championId: action.championId,
          wasAutoPicked: action.wasAutoPicked,
          lockedAt: new Date(action.lockedAt),
          ...(action.championId
            ? {
                championName: action.championId, // resolved later if needed
              }
            : {}),
        },
      }),
      prisma.draft.update({
        where: { id: draftId },
        data: {
          currentStep: nextStep,
          status,
          ...(startedAt ? { startedAt: new Date(startedAt) } : {}),
          ...(completedAt ? { completedAt: new Date(completedAt) } : {}),
        },
      }),
    ]);
  } catch (error) {
    const e = error as Prisma.PrismaClientKnownRequestError;
    if (e.code === 'P2002') {
      // already persisted — race with another worker. Safe to swallow.
      logger.warn({ draftId, step: action.step }, 'duplicate draft action ignored');
      return;
    }
    throw error;
  }
}

export async function markDraftStarted(draftId: string, startedAt: number): Promise<void> {
  await prisma.draft.update({
    where: { id: draftId },
    data: { status: 'IN_PROGRESS', startedAt: new Date(startedAt), currentStep: 1 },
  });
}

export async function markDraftCoinflipStarted(
  draftId: string,
  winnerTeamId: string,
): Promise<void> {
  await prisma.draft.update({
    where: { id: draftId },
    data: {
      status: 'COINFLIP',
      coinflipWinnerTeamId: winnerTeamId,
      coinflipDecision: null,
      coinflipResolvedAt: null,
    },
  });
}

export async function markDraftCancelled(draftId: string): Promise<void> {
  await prisma.draft.update({
    where: { id: draftId },
    data: { status: 'CANCELLED' },
  });
}

export async function markDraftPaused(draftId: string): Promise<void> {
  await prisma.draft.update({
    where: { id: draftId },
    data: { status: 'PAUSED' },
  });
}

export async function markDraftResumed(draftId: string): Promise<void> {
  await prisma.draft.update({
    where: { id: draftId },
    data: { status: 'IN_PROGRESS' },
  });
}
