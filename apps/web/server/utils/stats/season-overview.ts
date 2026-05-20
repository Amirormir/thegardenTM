import type { PrismaClient } from '@nexus/db';

/**
 * KPI bandeau totals for /league/stats. Mixes both sources by design — the
 * bandeau is the one place where we *want* to show "X drafts vs Y parsed
 * replays" side by side so users can see the gap.
 */

const ELIGIBLE_DRAFT_STATUSES = ['COMPLETED', 'IN_PROGRESS', 'PAUSED'] as const;

export interface SeasonOverview {
  seasonId: string;
  totalDrafts: number;
  decidedDrafts: number;
  totalPicks: number;
  totalBans: number;
  uniqueChampionsPicked: number;
  parsedReplays: number;
  parsedReplayGames: number;
}

export async function getSeasonOverview(
  prisma: PrismaClient,
  seasonId: string,
): Promise<SeasonOverview> {
  const draftScope = {
    seasonId,
    status: { in: [...ELIGIBLE_DRAFT_STATUSES] },
  };

  const [
    totalDrafts,
    decidedDrafts,
    totalPicks,
    totalBans,
    pickedChampions,
    parsedRows,
  ] = await Promise.all([
    prisma.draft.count({ where: draftScope }),
    prisma.draft.count({ where: { ...draftScope, NOT: { winnerSide: null } } }),
    prisma.draftAction.count({
      where: { type: 'PICK', draft: draftScope, NOT: { championId: null } },
    }),
    prisma.draftAction.count({
      where: { type: 'BAN', draft: draftScope, NOT: { championId: null } },
    }),
    prisma.draftAction.findMany({
      where: { type: 'PICK', draft: draftScope, NOT: { championId: null } },
      distinct: ['championId'],
      select: { championId: true },
    }),
    prisma.playerMatchStats.findMany({
      where: { matchGame: { match: { seasonId } } },
      select: { matchGameId: true },
      distinct: ['matchGameId'],
    }),
  ]);

  return {
    seasonId,
    totalDrafts,
    decidedDrafts,
    totalPicks,
    totalBans,
    uniqueChampionsPicked: pickedChampions.length,
    parsedReplays: parsedRows.length,
    parsedReplayGames: parsedRows.length,
  };
}
