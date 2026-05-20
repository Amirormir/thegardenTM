import type { PrismaClient } from '@nexus/db';

/**
 * Team leaderboard. Per docs/stats-source-of-truth.md §3:
 *   - Wins / losses / win rate            → Draft.winnerTeamId
 *   - Side preference (blue/red wins)     → Draft.blueTeamId/redTeamId + winnerSide
 *   - avg kills/deaths per game, avg game length → PlayerMatchStats (perf, may be null)
 *
 * A team with zero drafts in scope is omitted entirely. A team with drafts but
 * no parsed replays gets `performance: null`.
 */

const ELIGIBLE_DRAFT_STATUSES = ['COMPLETED', 'IN_PROGRESS', 'PAUSED'] as const;

export interface TeamLeaderboardScope {
  seasonId: string;
}

export interface TeamDraftBlock {
  teamId: string;
  teamName: string;
  teamShortCode: string;
  teamLogoUrl: string | null;
  drafts: number;
  wins: number;
  losses: number;
  winRate: number | null;
  blueSideGames: number;
  blueSideWins: number;
  blueSideWinRate: number | null;
  redSideGames: number;
  redSideWins: number;
  redSideWinRate: number | null;
}

export interface TeamPerformanceBlock {
  games: number;
  avgKillsPerGame: number;
  avgDeathsPerGame: number;
  teamKda: number;
  avgGameDurationSeconds: number;
}

export interface TeamLeaderboardRow extends TeamDraftBlock {
  performance: TeamPerformanceBlock | null;
}

export async function getTeamLeaderboard(
  prisma: PrismaClient,
  scope: TeamLeaderboardScope,
): Promise<TeamLeaderboardRow[]> {
  const drafts = await prisma.draft.findMany({
    where: {
      seasonId: scope.seasonId,
      status: { in: [...ELIGIBLE_DRAFT_STATUSES] },
    },
    select: {
      id: true,
      blueTeamId: true,
      redTeamId: true,
      winnerSide: true,
      winnerTeamId: true,
      blueTeam: { select: { id: true, name: true, shortCode: true, logoUrl: true } },
      redTeam: { select: { id: true, name: true, shortCode: true, logoUrl: true } },
    },
  });

  type Acc = TeamDraftBlock;
  const acc = new Map<string, Acc>();
  const ensure = (
    id: string,
    name: string,
    short: string,
    logo: string | null,
  ): Acc => {
    const cur = acc.get(id);
    if (cur) return cur;
    const fresh: Acc = {
      teamId: id,
      teamName: name,
      teamShortCode: short,
      teamLogoUrl: logo,
      drafts: 0,
      wins: 0,
      losses: 0,
      winRate: null,
      blueSideGames: 0,
      blueSideWins: 0,
      blueSideWinRate: null,
      redSideGames: 0,
      redSideWins: 0,
      redSideWinRate: null,
    };
    acc.set(id, fresh);
    return fresh;
  };

  for (const d of drafts) {
    const blue = ensure(d.blueTeam.id, d.blueTeam.name, d.blueTeam.shortCode, d.blueTeam.logoUrl);
    const red = ensure(d.redTeam.id, d.redTeam.name, d.redTeam.shortCode, d.redTeam.logoUrl);

    blue.drafts += 1;
    red.drafts += 1;
    blue.blueSideGames += 1;
    red.redSideGames += 1;

    if (d.winnerSide === 'BLUE') {
      blue.wins += 1;
      blue.blueSideWins += 1;
      red.losses += 1;
    } else if (d.winnerSide === 'RED') {
      red.wins += 1;
      red.redSideWins += 1;
      blue.losses += 1;
    }
  }

  for (const row of acc.values()) {
    const decided = row.wins + row.losses;
    row.winRate = decided === 0 ? null : row.wins / decided;
    row.blueSideWinRate =
      row.blueSideGames === 0 ? null : row.blueSideWins / row.blueSideGames;
    row.redSideWinRate = row.redSideGames === 0 ? null : row.redSideWins / row.redSideGames;
  }

  // Performance block — replay-derived. Skip when no PlayerMatchStats exist.
  const perfStats = await prisma.playerMatchStats.findMany({
    where: { matchGame: { match: { seasonId: scope.seasonId } } },
    select: {
      teamId: true,
      kills: true,
      deaths: true,
      matchGameId: true,
      matchGame: { select: { durationSeconds: true } },
    },
  });

  type PerfAcc = {
    games: Set<string>; // distinct matchGameId
    kills: number;
    deaths: number;
    durationSeconds: number;
  };
  const perf = new Map<string, PerfAcc>();
  for (const s of perfStats) {
    const cur =
      perf.get(s.teamId) ??
      ({
        games: new Set<string>(),
        kills: 0,
        deaths: 0,
        durationSeconds: 0,
      } satisfies PerfAcc);
    if (!cur.games.has(s.matchGameId)) {
      cur.games.add(s.matchGameId);
      cur.durationSeconds += s.matchGame.durationSeconds ?? 0;
    }
    cur.kills += s.kills;
    cur.deaths += s.deaths;
    perf.set(s.teamId, cur);
  }

  const rows: TeamLeaderboardRow[] = [];
  for (const draft of acc.values()) {
    const p = perf.get(draft.teamId);
    const performance: TeamPerformanceBlock | null = p
      ? {
          games: p.games.size,
          avgKillsPerGame: p.games.size > 0 ? p.kills / (p.games.size * 5) : 0,
          avgDeathsPerGame: p.games.size > 0 ? p.deaths / (p.games.size * 5) : 0,
          teamKda: p.kills / Math.max(p.deaths, 1),
          avgGameDurationSeconds: p.games.size > 0 ? p.durationSeconds / p.games.size : 0,
        }
      : null;
    rows.push({ ...draft, performance });
  }

  rows.sort((a, b) => {
    const wa = a.winRate ?? -1;
    const wb = b.winRate ?? -1;
    if (wb !== wa) return wb - wa;
    return b.drafts - a.drafts;
  });
  return rows;
}
