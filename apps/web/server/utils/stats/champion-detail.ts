import type { PrismaClient } from '@nexus/db';
import { resolveStoredPlayerDisplayName } from '@/lib/utils/player-display';

/**
 * Champion detail page payload. Follows the source-of-truth rule (§3): every
 * draft-side metric here counts DraftAction rows; every performance metric
 * pulls from PlayerMatchStats. The two are joined client-side on championId.
 */

const ELIGIBLE_DRAFT_STATUSES = ['COMPLETED', 'IN_PROGRESS', 'PAUSED'] as const;

export interface ChampionDetailScope {
  seasonId: string;
  championId: string;
}

export interface ChampionTopPlayerRow {
  playerId: string;
  displayName: string;
  gameName: string;
  role: string;
  teamShortCode: string;
  games: number;
  wins: number;
  winRate: number;
  kda: number;
}

export interface ChampionRecentPick {
  draftId: string;
  gameNumber: number;
  matchId: string;
  blueTeamShortCode: string;
  redTeamShortCode: string;
  pickedSide: 'BLUE' | 'RED';
  result: 'WIN' | 'LOSS' | 'PENDING';
  lockedAt: number;
}

export interface ChampionDetail {
  championId: string;
  seasonId: string;
  totalDrafts: number;
  pickCount: number;
  banCount: number;
  presenceRate: number | null;
  winCount: number;
  lossCount: number;
  winRate: number | null;
  blueSide: { picks: number; wins: number; winRate: number | null };
  redSide: { picks: number; wins: number; winRate: number | null };
  performance: {
    games: number;
    kda: number;
    avgKills: number;
    avgDeaths: number;
    avgAssists: number;
    avgCsPerMin: number;
    avgGoldPerMin: number;
    avgDamagePerMin: number;
    avgDamageShare: number;
    avgKillParticipation: number;
  } | null;
  topPlayers: ChampionTopPlayerRow[];
  recentPicks: ChampionRecentPick[];
}

export async function getChampionDetail(
  prisma: PrismaClient,
  scope: ChampionDetailScope,
): Promise<ChampionDetail> {
  const draftScope = {
    seasonId: scope.seasonId,
    status: { in: [...ELIGIBLE_DRAFT_STATUSES] },
  };

  const [actions, totalDrafts, perfStats, recentActions] = await Promise.all([
    prisma.draftAction.findMany({
      where: {
        championId: scope.championId,
        draft: draftScope,
      },
      select: {
        type: true,
        side: true,
        draft: { select: { winnerSide: true } },
      },
    }),
    prisma.draft.count({ where: draftScope }),
    prisma.playerMatchStats.findMany({
      where: {
        champion: scope.championId,
        matchGame: { match: { seasonId: scope.seasonId } },
      },
      select: {
        playerId: true,
        kills: true,
        deaths: true,
        assists: true,
        result: true,
        csPerMin: true,
        goldPerMin: true,
        damagePerMin: true,
        damageShare: true,
        killParticipation: true,
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            gameName: true,
            role: true,
            team: { select: { shortCode: true } },
          },
        },
      },
    }),
    prisma.draftAction.findMany({
      where: {
        championId: scope.championId,
        type: 'PICK',
        draft: draftScope,
      },
      orderBy: { lockedAt: 'desc' },
      take: 10,
      select: {
        side: true,
        lockedAt: true,
        draft: {
          select: {
            id: true,
            matchId: true,
            gameNumber: true,
            winnerSide: true,
            blueTeam: { select: { shortCode: true } },
            redTeam: { select: { shortCode: true } },
          },
        },
      },
    }),
  ]);

  let pickCount = 0;
  let banCount = 0;
  let winCount = 0;
  let lossCount = 0;
  let bluePicks = 0;
  let blueWins = 0;
  let redPicks = 0;
  let redWins = 0;

  for (const a of actions) {
    if (a.type === 'BAN') {
      banCount += 1;
      continue;
    }
    if (a.type !== 'PICK') continue;
    pickCount += 1;
    if (a.side === 'BLUE') bluePicks += 1;
    if (a.side === 'RED') redPicks += 1;
    if (a.draft.winnerSide) {
      const won = a.draft.winnerSide === a.side;
      if (won) {
        winCount += 1;
        if (a.side === 'BLUE') blueWins += 1;
        else redWins += 1;
      } else {
        lossCount += 1;
      }
    }
  }

  const presenceRate = totalDrafts === 0 ? null : (pickCount + banCount) / totalDrafts;
  const decided = winCount + lossCount;
  const winRate = decided === 0 ? null : winCount / decided;

  // Performance block — only present if at least one parsed replay used this champion.
  let performance: ChampionDetail['performance'] = null;
  if (perfStats.length > 0) {
    const g = perfStats.length;
    const totals = perfStats.reduce(
      (acc, s) => {
        acc.kills += s.kills;
        acc.deaths += s.deaths;
        acc.assists += s.assists;
        acc.csPerMin += s.csPerMin;
        acc.goldPerMin += s.goldPerMin;
        acc.damagePerMin += s.damagePerMin;
        acc.damageShare += s.damageShare;
        acc.killParticipation += s.killParticipation;
        return acc;
      },
      {
        kills: 0,
        deaths: 0,
        assists: 0,
        csPerMin: 0,
        goldPerMin: 0,
        damagePerMin: 0,
        damageShare: 0,
        killParticipation: 0,
      },
    );
    performance = {
      games: g,
      kda: (totals.kills + totals.assists) / Math.max(totals.deaths, 1),
      avgKills: totals.kills / g,
      avgDeaths: totals.deaths / g,
      avgAssists: totals.assists / g,
      avgCsPerMin: totals.csPerMin / g,
      avgGoldPerMin: totals.goldPerMin / g,
      avgDamagePerMin: totals.damagePerMin / g,
      avgDamageShare: totals.damageShare / g,
      avgKillParticipation: totals.killParticipation / g,
    };
  }

  // Top players on this champion (replay-derived, since draft doesn't know who
  // picked the champ in which lane).
  type PlayerAcc = {
    playerId: string;
    displayName: string;
    gameName: string;
    role: string;
    teamShortCode: string;
    games: number;
    wins: number;
    kills: number;
    deaths: number;
    assists: number;
  };
  const byPlayer = new Map<string, PlayerAcc>();
  for (const s of perfStats) {
    const cur =
      byPlayer.get(s.playerId) ??
      ({
        playerId: s.player.id,
        displayName: resolveStoredPlayerDisplayName(s.player),
        gameName: s.player.gameName,
        role: s.player.role,
        teamShortCode: s.player.team?.shortCode ?? 'FA',
        games: 0,
        wins: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
      } satisfies PlayerAcc);
    cur.games += 1;
    cur.wins += s.result === 'WIN' ? 1 : 0;
    cur.kills += s.kills;
    cur.deaths += s.deaths;
    cur.assists += s.assists;
    byPlayer.set(s.playerId, cur);
  }
  const topPlayers: ChampionTopPlayerRow[] = [...byPlayer.values()]
    .map((v) => ({
      playerId: v.playerId,
      displayName: v.displayName,
      gameName: v.gameName,
      role: v.role,
      teamShortCode: v.teamShortCode,
      games: v.games,
      wins: v.wins,
      winRate: v.games > 0 ? v.wins / v.games : 0,
      kda: (v.kills + v.assists) / Math.max(v.deaths, 1),
    }))
    .sort((a, b) => {
      if (b.games !== a.games) return b.games - a.games;
      return b.winRate - a.winRate;
    })
    .slice(0, 5);

  const recentPicks: ChampionRecentPick[] = recentActions.map((a) => ({
    draftId: a.draft.id,
    gameNumber: a.draft.gameNumber,
    matchId: a.draft.matchId,
    blueTeamShortCode: a.draft.blueTeam.shortCode,
    redTeamShortCode: a.draft.redTeam.shortCode,
    pickedSide: a.side,
    result: !a.draft.winnerSide
      ? 'PENDING'
      : a.draft.winnerSide === a.side
        ? 'WIN'
        : 'LOSS',
    lockedAt: a.lockedAt.getTime(),
  }));

  return {
    championId: scope.championId,
    seasonId: scope.seasonId,
    totalDrafts,
    pickCount,
    banCount,
    presenceRate,
    winCount,
    lossCount,
    winRate,
    blueSide: {
      picks: bluePicks,
      wins: blueWins,
      winRate: bluePicks === 0 ? null : blueWins / bluePicks,
    },
    redSide: {
      picks: redPicks,
      wins: redWins,
      winRate: redPicks === 0 ? null : redWins / redPicks,
    },
    performance,
    topPlayers,
    recentPicks,
  };
}
