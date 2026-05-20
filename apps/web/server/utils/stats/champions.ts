import type { PrismaClient } from '@nexus/db';

/**
 * Champion leaderboard helpers. See docs/stats-source-of-truth.md §3:
 *
 *   - picks, bans, presence, draft win rate  → DraftAction + Draft.winnerSide
 *   - KDA, CS/min, gold/min, damage/min      → PlayerMatchStats (replay)
 *
 * The two blocks are computed independently and joined by champion id so a
 * missing replay never blanks the draft column.
 */

const ELIGIBLE_DRAFT_STATUSES = ['COMPLETED', 'IN_PROGRESS', 'PAUSED'] as const;

export interface ChampionDraftBlock {
  championId: string;
  pickCount: number;
  banCount: number;
  presenceRate: number | null;
  winCount: number;
  lossCount: number;
  winRate: number | null;
}

export interface ChampionPerformanceBlock {
  championId: string;
  games: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  kda: number;
  avgCsPerMin: number;
  avgGoldPerMin: number;
  avgDamagePerMin: number;
  avgDamageShare: number;
  avgKillParticipation: number;
}

export interface ChampionLeaderboardRow extends ChampionDraftBlock {
  performance: ChampionPerformanceBlock | null;
}

export interface ChampionLeaderboardScope {
  seasonId: string;
  role?: 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';
}

/**
 * Aggregate every PICK/BAN action and side-vs-winnerSide for the given season
 * in a single pass. Roles aren't recorded on DraftAction, so role filtering
 * only applies to the performance block.
 */
export async function getChampionDraftBlocks(
  prisma: PrismaClient,
  scope: ChampionLeaderboardScope,
): Promise<{ rows: Map<string, ChampionDraftBlock>; totalDrafts: number }> {
  const draftWhere = {
    seasonId: scope.seasonId,
    status: { in: [...ELIGIBLE_DRAFT_STATUSES] },
  };

  const [actions, totalDrafts] = await Promise.all([
    prisma.draftAction.findMany({
      where: {
        draft: draftWhere,
        NOT: { championId: null },
      },
      select: {
        championId: true,
        type: true,
        side: true,
        draft: { select: { winnerSide: true } },
      },
    }),
    prisma.draft.count({ where: draftWhere }),
  ]);

  const rows = new Map<string, ChampionDraftBlock>();
  for (const action of actions) {
    if (!action.championId) continue;
    const row =
      rows.get(action.championId) ??
      ({
        championId: action.championId,
        pickCount: 0,
        banCount: 0,
        presenceRate: null,
        winCount: 0,
        lossCount: 0,
        winRate: null,
      } satisfies ChampionDraftBlock);

    if (action.type === 'PICK') {
      row.pickCount += 1;
      const winnerSide = action.draft.winnerSide;
      if (winnerSide) {
        if (winnerSide === action.side) row.winCount += 1;
        else row.lossCount += 1;
      }
    } else if (action.type === 'BAN') {
      row.banCount += 1;
    }

    rows.set(action.championId, row);
  }

  for (const row of rows.values()) {
    row.presenceRate =
      totalDrafts === 0 ? null : (row.pickCount + row.banCount) / totalDrafts;
    const recorded = row.winCount + row.lossCount;
    row.winRate = recorded === 0 ? null : row.winCount / recorded;
  }

  return { rows, totalDrafts };
}

/**
 * Per-champion performance averages from PlayerMatchStats. Champions not yet
 * parsed in a replay simply don't appear in the returned map; the caller is
 * responsible for rendering "—" rather than 0.
 */
export async function getChampionPerformanceBlocks(
  prisma: PrismaClient,
  scope: ChampionLeaderboardScope,
): Promise<Map<string, ChampionPerformanceBlock>> {
  const stats = await prisma.playerMatchStats.findMany({
    where: {
      matchGame: { match: { seasonId: scope.seasonId } },
      ...(scope.role ? { player: { role: scope.role } } : {}),
    },
    select: {
      champion: true,
      kills: true,
      deaths: true,
      assists: true,
      csPerMin: true,
      goldPerMin: true,
      damagePerMin: true,
      damageShare: true,
      killParticipation: true,
    },
  });

  type Acc = {
    games: number;
    kills: number;
    deaths: number;
    assists: number;
    csPerMin: number;
    goldPerMin: number;
    damagePerMin: number;
    damageShare: number;
    killParticipation: number;
  };
  const acc = new Map<string, Acc>();
  for (const stat of stats) {
    const current =
      acc.get(stat.champion) ??
      ({
        games: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        csPerMin: 0,
        goldPerMin: 0,
        damagePerMin: 0,
        damageShare: 0,
        killParticipation: 0,
      } satisfies Acc);
    current.games += 1;
    current.kills += stat.kills;
    current.deaths += stat.deaths;
    current.assists += stat.assists;
    current.csPerMin += stat.csPerMin;
    current.goldPerMin += stat.goldPerMin;
    current.damagePerMin += stat.damagePerMin;
    current.damageShare += stat.damageShare;
    current.killParticipation += stat.killParticipation;
    acc.set(stat.champion, current);
  }

  const out = new Map<string, ChampionPerformanceBlock>();
  for (const [championId, v] of acc) {
    const g = v.games;
    out.set(championId, {
      championId,
      games: g,
      avgKills: v.kills / g,
      avgDeaths: v.deaths / g,
      avgAssists: v.assists / g,
      kda: (v.kills + v.assists) / Math.max(v.deaths, 1),
      avgCsPerMin: v.csPerMin / g,
      avgGoldPerMin: v.goldPerMin / g,
      avgDamagePerMin: v.damagePerMin / g,
      avgDamageShare: v.damageShare / g,
      avgKillParticipation: v.killParticipation / g,
    });
  }
  return out;
}

/**
 * Combined leaderboard: every champion that has at least one draft action in
 * scope, joined with its performance block when a replay was parsed.
 */
export async function getChampionLeaderboard(
  prisma: PrismaClient,
  scope: ChampionLeaderboardScope,
): Promise<{ rows: ChampionLeaderboardRow[]; totalDrafts: number }> {
  const [draftSide, perfSide] = await Promise.all([
    getChampionDraftBlocks(prisma, scope),
    getChampionPerformanceBlocks(prisma, scope),
  ]);

  const rows: ChampionLeaderboardRow[] = [];
  for (const draft of draftSide.rows.values()) {
    rows.push({
      ...draft,
      performance: perfSide.get(draft.championId) ?? null,
    });
  }

  rows.sort((a, b) => {
    const presenceA = a.presenceRate ?? 0;
    const presenceB = b.presenceRate ?? 0;
    if (presenceB !== presenceA) return presenceB - presenceA;
    return a.championId.localeCompare(b.championId);
  });

  return { rows, totalDrafts: draftSide.totalDrafts };
}
