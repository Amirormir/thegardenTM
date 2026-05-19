import { prisma } from '@nexus/db';
import type { ChampionStats } from '@nexus/draft-engine';
import { redis } from './redis.js';

const STATS_TTL_SECONDS = 60 * 60 * 6; // 6h

const ELIGIBLE_DRAFT_STATUSES = ['COMPLETED', 'IN_PROGRESS', 'PAUSED'] as const;

function statsKey(seasonId: string, championId: string): string {
  return `split:${seasonId}:champion:${championId}:stats`;
}

async function computeChampionStats(
  seasonId: string,
  championId: string,
): Promise<ChampionStats> {
  const draftScope = {
    seasonId,
    status: { in: [...ELIGIBLE_DRAFT_STATUSES] },
  };

  // Win = pick on the side that won; loss = pick on the opposite side.
  // Only drafts where both captains agreed on a winnerSide are counted.
  const [pickCount, banCount, totalDrafts, blueWins, redWins, blueLosses, redLosses] =
    await Promise.all([
      prisma.draftAction.count({
        where: { championId, type: 'PICK', draft: draftScope },
      }),
      prisma.draftAction.count({
        where: { championId, type: 'BAN', draft: draftScope },
      }),
      prisma.draft.count({ where: draftScope }),
      prisma.draftAction.count({
        where: { championId, type: 'PICK', side: 'BLUE', draft: { seasonId, winnerSide: 'BLUE' } },
      }),
      prisma.draftAction.count({
        where: { championId, type: 'PICK', side: 'RED', draft: { seasonId, winnerSide: 'RED' } },
      }),
      prisma.draftAction.count({
        where: { championId, type: 'PICK', side: 'BLUE', draft: { seasonId, winnerSide: 'RED' } },
      }),
      prisma.draftAction.count({
        where: { championId, type: 'PICK', side: 'RED', draft: { seasonId, winnerSide: 'BLUE' } },
      }),
    ]);

  const winCount = blueWins + redWins;
  const lossCount = blueLosses + redLosses;
  const recordedGames = winCount + lossCount;

  const presenceRate = totalDrafts === 0 ? null : (pickCount + banCount) / totalDrafts;
  const winRate = recordedGames === 0 ? null : winCount / recordedGames;

  return {
    championId,
    pickCount,
    banCount,
    totalDrafts,
    presenceRate,
    winCount,
    lossCount,
    winRate,
  };
}

export async function getChampionStats(
  seasonId: string,
  championId: string,
): Promise<ChampionStats> {
  const k = statsKey(seasonId, championId);
  const raw = await redis.get(k);
  if (raw) {
    try {
      return JSON.parse(raw) as ChampionStats;
    } catch {
      // corrupted entry — fall through and recompute
    }
  }
  const stats = await computeChampionStats(seasonId, championId);
  await redis.set(k, JSON.stringify(stats), 'EX', STATS_TTL_SECONDS);
  return stats;
}

export async function invalidateChampionStats(
  seasonId: string,
  championId: string,
): Promise<void> {
  await redis.del(statsKey(seasonId, championId));
}

const draftSeasonCache = new Map<string, string>();

export async function getSeasonIdForDraft(draftId: string): Promise<string | null> {
  const cached = draftSeasonCache.get(draftId);
  if (cached) return cached;
  const row = await prisma.draft.findUnique({
    where: { id: draftId },
    select: { seasonId: true },
  });
  if (!row) return null;
  draftSeasonCache.set(draftId, row.seasonId);
  return row.seasonId;
}
