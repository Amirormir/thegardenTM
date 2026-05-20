import type { PrismaClient } from '@nexus/db';
import { resolveStoredPlayerDisplayName } from '@/lib/utils/player-display';

/**
 * Player leaderboard. Per docs/stats-source-of-truth.md §3:
 * every row here is replay-derived from PlayerMatchStats. A player without any
 * parsed game simply doesn't appear in the leaderboard.
 */

export interface PlayerLeaderboardScope {
  seasonId: string;
  role?: 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';
}

export interface PlayerLeaderboardRow {
  playerId: string;
  displayName: string;
  gameName: string;
  role: string;
  imageUrl: string | null;
  teamId: string | null;
  teamName: string;
  teamShortCode: string;
  teamLogoUrl: string | null;
  games: number;
  wins: number;
  winRate: number;
  kda: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgCsPerMin: number;
  avgGoldPerMin: number;
  avgDamagePerMin: number;
  avgVisionScore: number;
  avgKillParticipation: number;
  avgDamageShare: number;
  uniqueChampions: number;
  mostPlayedChampion: string | null;
  mostPlayedChampionGames: number;
}

export async function getPlayerLeaderboard(
  prisma: PrismaClient,
  scope: PlayerLeaderboardScope,
): Promise<PlayerLeaderboardRow[]> {
  const stats = await prisma.playerMatchStats.findMany({
    where: {
      matchGame: { match: { seasonId: scope.seasonId } },
      ...(scope.role ? { player: { role: scope.role } } : {}),
    },
    select: {
      playerId: true,
      champion: true,
      kills: true,
      deaths: true,
      assists: true,
      visionScore: true,
      result: true,
      csPerMin: true,
      goldPerMin: true,
      damagePerMin: true,
      killParticipation: true,
      damageShare: true,
      player: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          gameName: true,
          role: true,
          imageUrl: true,
          team: {
            select: {
              id: true,
              name: true,
              shortCode: true,
              logoUrl: true,
            },
          },
        },
      },
    },
  });

  type Acc = {
    playerId: string;
    displayName: string;
    gameName: string;
    role: string;
    imageUrl: string | null;
    teamId: string | null;
    teamName: string;
    teamShortCode: string;
    teamLogoUrl: string | null;
    games: number;
    wins: number;
    kills: number;
    deaths: number;
    assists: number;
    visionScore: number;
    csPerMin: number;
    goldPerMin: number;
    damagePerMin: number;
    killParticipation: number;
    damageShare: number;
    champions: Map<string, number>;
  };

  const acc = new Map<string, Acc>();
  for (const stat of stats) {
    const current =
      acc.get(stat.playerId) ??
      ({
        playerId: stat.player.id,
        displayName: resolveStoredPlayerDisplayName(stat.player),
        gameName: stat.player.gameName,
        role: stat.player.role,
        imageUrl: stat.player.imageUrl,
        teamId: stat.player.team?.id ?? null,
        teamName: stat.player.team?.name ?? 'Free Agent',
        teamShortCode: stat.player.team?.shortCode ?? 'FA',
        teamLogoUrl: stat.player.team?.logoUrl ?? null,
        games: 0,
        wins: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        visionScore: 0,
        csPerMin: 0,
        goldPerMin: 0,
        damagePerMin: 0,
        killParticipation: 0,
        damageShare: 0,
        champions: new Map<string, number>(),
      } satisfies Acc);

    current.games += 1;
    current.wins += stat.result === 'WIN' ? 1 : 0;
    current.kills += stat.kills;
    current.deaths += stat.deaths;
    current.assists += stat.assists;
    current.visionScore += stat.visionScore;
    current.csPerMin += stat.csPerMin;
    current.goldPerMin += stat.goldPerMin;
    current.damagePerMin += stat.damagePerMin;
    current.killParticipation += stat.killParticipation;
    current.damageShare += stat.damageShare;
    current.champions.set(stat.champion, (current.champions.get(stat.champion) ?? 0) + 1);
    acc.set(stat.playerId, current);
  }

  return [...acc.values()].map((v) => {
    const g = v.games;
    const mostPlayed = [...v.champions.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      playerId: v.playerId,
      displayName: v.displayName,
      gameName: v.gameName,
      role: v.role,
      imageUrl: v.imageUrl,
      teamId: v.teamId,
      teamName: v.teamName,
      teamShortCode: v.teamShortCode,
      teamLogoUrl: v.teamLogoUrl,
      games: g,
      wins: v.wins,
      winRate: g > 0 ? v.wins / g : 0,
      kda: (v.kills + v.assists) / Math.max(v.deaths, 1),
      avgKills: v.kills / g,
      avgDeaths: v.deaths / g,
      avgAssists: v.assists / g,
      avgCsPerMin: v.csPerMin / g,
      avgGoldPerMin: v.goldPerMin / g,
      avgDamagePerMin: v.damagePerMin / g,
      avgVisionScore: v.visionScore / g,
      avgKillParticipation: v.killParticipation / g,
      avgDamageShare: v.damageShare / g,
      uniqueChampions: v.champions.size,
      mostPlayedChampion: mostPlayed ? mostPlayed[0] : null,
      mostPlayedChampionGames: mostPlayed ? mostPlayed[1] : 0,
    };
  });
}
