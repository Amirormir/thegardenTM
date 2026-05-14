import { TRPCError } from '@trpc/server';
import {
  getAccountByRiotId,
  getMatchDetail,
  getMatchHistory,
  getMatchTimeline,
  getRankedInfo,
  RiotApiError,
} from '@/lib/riot';
import { resolveStoredPlayerDisplayName } from '@/lib/utils/player-display';
import { fetchFromRiotSchema, leagueStatsSchema, playerStatsSchema } from '@/lib/validators/stats';
import { createTRPCRouter, protectedProcedure, publicProcedure } from '@/server/trpc';

function mapRiotErrorToTRPC(error: unknown): never {
  if (error instanceof RiotApiError) {
    if (error.status === 403) {
      throw new TRPCError({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Riot API key expired or revoked. Please regenerate it.',
        cause: error,
      });
    }
    if (error.status === 429) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Riot API rate limit reached. Retry shortly.',
        cause: error,
      });
    }
    if (error.status === 404) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Riot resource not found.',
        cause: error,
      });
    }
    if (error.status >= 500) {
      throw new TRPCError({
        code: 'BAD_GATEWAY',
        message: 'Riot API is unavailable. Try again later.',
        cause: error,
      });
    }
  }
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Unexpected error while contacting Riot API.',
    cause: error,
  });
}

export const statsRouter = createTRPCRouter({
  getPlayerStats: publicProcedure.input(playerStatsSchema).query(async ({ ctx, input }) => {
    const player = await ctx.prisma.player.findUnique({
      where: { id: input.playerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        gameName: true,
        role: true,
      },
    });

    if (!player) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Player not found.' });
    }

    const stats = await ctx.prisma.playerMatchStats.findMany({
      where: { playerId: input.playerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        champion: true,
        kills: true,
        deaths: true,
        assists: true,
        cs: true,
        gold: true,
        damage: true,
        visionScore: true,
        result: true,
        createdAt: true,
        matchGame: {
          select: {
            gameNumber: true,
            match: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    const games = stats.length;
    const totals = stats.reduce(
      (accumulator, stat) => ({
        kills: accumulator.kills + stat.kills,
        deaths: accumulator.deaths + stat.deaths,
        assists: accumulator.assists + stat.assists,
        cs: accumulator.cs + stat.cs,
        gold: accumulator.gold + stat.gold,
        damage: accumulator.damage + stat.damage,
        visionScore: accumulator.visionScore + stat.visionScore,
        wins: accumulator.wins + (stat.result === 'WIN' ? 1 : 0),
      }),
      {
        kills: 0,
        deaths: 0,
        assists: 0,
        cs: 0,
        gold: 0,
        damage: 0,
        visionScore: 0,
        wins: 0,
      },
    );

    const divisor = games || 1;
    const championMap = stats.reduce(
      (accumulator, stat) => {
        const current = accumulator.get(stat.champion) ?? {
          champion: stat.champion,
          games: 0,
          wins: 0,
          kills: 0,
          deaths: 0,
          assists: 0,
          damage: 0,
        };

        current.games += 1;
        current.wins += stat.result === 'WIN' ? 1 : 0;
        current.kills += stat.kills;
        current.deaths += stat.deaths;
        current.assists += stat.assists;
        current.damage += stat.damage;
        accumulator.set(stat.champion, current);
        return accumulator;
      },
      new Map<
        string,
        {
          champion: string;
          games: number;
          wins: number;
          kills: number;
          deaths: number;
          assists: number;
          damage: number;
        }
      >(),
    );
    const championPool = [...championMap.values()]
      .map((entry) => ({
        champion: entry.champion,
        games: entry.games,
        wins: entry.wins,
        winRate: entry.games > 0 ? entry.wins / entry.games : 0,
        kda: (entry.kills + entry.assists) / Math.max(entry.deaths, 1),
        avgDamage: entry.damage / Math.max(entry.games, 1),
        poolShare: games > 0 ? entry.games / games : 0,
        damageShare: totals.damage > 0 ? entry.damage / totals.damage : 0,
      }))
      .sort((left, right) => {
        if (right.games !== left.games) return right.games - left.games;
        if (right.winRate !== left.winRate) return right.winRate - left.winRate;
        return left.champion.localeCompare(right.champion);
      });

    return {
      player: {
        ...player,
        displayName: resolveStoredPlayerDisplayName(player),
      },
      summary: {
        games,
        wins: totals.wins,
        avgKills: totals.kills / divisor,
        avgDeaths: totals.deaths / divisor,
        avgAssists: totals.assists / divisor,
        avgCs: totals.cs / divisor,
        avgGold: totals.gold / divisor,
        avgDamage: totals.damage / divisor,
        avgVisionScore: totals.visionScore / divisor,
      },
      championPool,
      recentGames: stats.slice(0, 10),
    };
  }),

  getLeagueLeaders: publicProcedure.query(async ({ ctx }) => {
    const aggregates = await ctx.prisma.playerMatchStats.groupBy({
      by: ['playerId'],
      _count: { _all: true },
      _sum: {
        kills: true,
        deaths: true,
        assists: true,
        cs: true,
        damage: true,
      },
    });

    if (aggregates.length === 0) {
      return { kdaLeader: [], csLeader: [], damageLeader: [] };
    }

    const players = await ctx.prisma.player.findMany({
      where: { id: { in: aggregates.map((entry) => entry.playerId) } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        gameName: true,
        role: true,
        team: {
          select: {
            name: true,
            shortCode: true,
          },
        },
      },
    });

    const playerById = new Map(players.map((player) => [player.id, player]));

    const rows = aggregates.flatMap((entry) => {
      const player = playerById.get(entry.playerId);
      if (!player) return [];
      const games = entry._count._all;
      const kills = entry._sum.kills ?? 0;
      const deaths = entry._sum.deaths ?? 0;
      const assists = entry._sum.assists ?? 0;
      const cs = entry._sum.cs ?? 0;
      const damage = entry._sum.damage ?? 0;
      return [
        {
          playerId: player.id,
          displayName: resolveStoredPlayerDisplayName(player),
          gameName: player.gameName,
          role: player.role,
          teamName: player.team?.name ?? 'Free Agent',
          shortCode: player.team?.shortCode ?? 'FA',
          games,
          kills,
          deaths,
          assists,
          cs,
          damage,
          kda: (kills + assists) / Math.max(deaths, 1),
          avgCs: cs / Math.max(games, 1),
          avgDamage: damage / Math.max(games, 1),
        },
      ];
    });

    return {
      kdaLeader: [...rows].sort((left, right) => right.kda - left.kda).slice(0, 5),
      csLeader: [...rows].sort((left, right) => right.avgCs - left.avgCs).slice(0, 5),
      damageLeader: [...rows].sort((left, right) => right.avgDamage - left.avgDamage).slice(0, 5),
    };
  }),

  getLeagueStats: publicProcedure.input(leagueStatsSchema).query(async ({ ctx, input }) => {
    const seasonFilter = input?.seasonId
      ? { matchGame: { match: { seasonId: input.seasonId } } }
      : {};
    const roleFilter = input?.role ? { player: { role: input.role } } : {};

    const stats = await ctx.prisma.playerMatchStats.findMany({
      where: {
        ...seasonFilter,
        ...roleFilter,
      },
      select: {
        playerId: true,
        champion: true,
        kills: true,
        deaths: true,
        assists: true,
        cs: true,
        gold: true,
        damage: true,
        visionScore: true,
        result: true,
        side: true,
        matchGame: {
          select: {
            durationSeconds: true,
            match: {
              select: {
                homeTeamId: true,
                awayTeamId: true,
              },
            },
          },
        },
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

    // Player aggregation
    const playerMap = new Map<
      string,
      {
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
        cs: number;
        gold: number;
        damage: number;
        visionScore: number;
        totalDurationSeconds: number;
        champions: Map<string, number>;
      }
    >();

    // Team aggregation
    const teamMap = new Map<
      string,
      {
        teamId: string;
        teamName: string;
        teamShortCode: string;
        teamLogoUrl: string | null;
        games: number;
        wins: number;
        kills: number;
        deaths: number;
        totalDurationSeconds: number;
        blueSideWins: number;
        blueSideGames: number;
        redSideWins: number;
        redSideGames: number;
      }
    >();

    // Champion aggregation
    const championMap = new Map<
      string,
      {
        champion: string;
        games: number;
        wins: number;
        kills: number;
        deaths: number;
        assists: number;
        bans: number;
      }
    >();

    for (const stat of stats) {
      // Player
      const current = playerMap.get(stat.playerId) ?? {
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
        cs: 0,
        gold: 0,
        damage: 0,
        visionScore: 0,
        totalDurationSeconds: 0,
        champions: new Map<string, number>(),
      };

      current.games += 1;
      current.wins += stat.result === 'WIN' ? 1 : 0;
      current.kills += stat.kills;
      current.deaths += stat.deaths;
      current.assists += stat.assists;
      current.cs += stat.cs;
      current.gold += stat.gold;
      current.damage += stat.damage;
      current.visionScore += stat.visionScore;
      current.totalDurationSeconds += stat.matchGame.durationSeconds ?? 0;
      current.champions.set(stat.champion, (current.champions.get(stat.champion) ?? 0) + 1);
      playerMap.set(stat.playerId, current);

      // Team
      if (stat.player.team) {
        const teamId = stat.player.team.id;
        const teamCurrent = teamMap.get(teamId) ?? {
          teamId,
          teamName: stat.player.team.name,
          teamShortCode: stat.player.team.shortCode,
          teamLogoUrl: stat.player.team.logoUrl,
          games: 0,
          wins: 0,
          kills: 0,
          deaths: 0,
          totalDurationSeconds: 0,
          blueSideWins: 0,
          blueSideGames: 0,
          redSideWins: 0,
          redSideGames: 0,
        };
        // Only count once per game per team (use role to avoid double counting — count only TOP lane)
        if (stat.player.role === 'TOP') {
          teamCurrent.games += 1;
          teamCurrent.wins += stat.result === 'WIN' ? 1 : 0;
          teamCurrent.totalDurationSeconds += stat.matchGame.durationSeconds ?? 0;
          if (stat.side === 'BLUE') {
            teamCurrent.blueSideGames += 1;
            teamCurrent.blueSideWins += stat.result === 'WIN' ? 1 : 0;
          } else {
            teamCurrent.redSideGames += 1;
            teamCurrent.redSideWins += stat.result === 'WIN' ? 1 : 0;
          }
        }
        teamCurrent.kills += stat.kills;
        teamCurrent.deaths += stat.deaths;
        teamMap.set(teamId, teamCurrent);
      }

      // Champion
      const champCurrent = championMap.get(stat.champion) ?? {
        champion: stat.champion,
        games: 0,
        wins: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        bans: 0,
      };
      champCurrent.games += 1;
      champCurrent.wins += stat.result === 'WIN' ? 1 : 0;
      champCurrent.kills += stat.kills;
      champCurrent.deaths += stat.deaths;
      champCurrent.assists += stat.assists;
      championMap.set(stat.champion, champCurrent);
    }

    const playerRows = [...playerMap.values()].map((entry) => {
      const durationMinutes = entry.totalDurationSeconds / 60 || 1;
      const uniqueChampions = entry.champions.size;
      const mostPlayed = [...entry.champions.entries()].sort((a, b) => b[1] - a[1])[0];
      return {
        playerId: entry.playerId,
        displayName: entry.displayName,
        gameName: entry.gameName,
        role: entry.role,
        imageUrl: entry.imageUrl,
        teamId: entry.teamId,
        teamName: entry.teamName,
        teamShortCode: entry.teamShortCode,
        teamLogoUrl: entry.teamLogoUrl,
        games: entry.games,
        wins: entry.wins,
        winRate: entry.games > 0 ? entry.wins / entry.games : 0,
        kda: (entry.kills + entry.assists) / Math.max(entry.deaths, 1),
        avgKills: entry.kills / Math.max(entry.games, 1),
        avgDeaths: entry.deaths / Math.max(entry.games, 1),
        avgAssists: entry.assists / Math.max(entry.games, 1),
        avgCs: entry.cs / Math.max(entry.games, 1),
        csPerMin: entry.cs / durationMinutes,
        avgGold: entry.gold / Math.max(entry.games, 1),
        goldPerMin: entry.gold / durationMinutes,
        avgDamage: entry.damage / Math.max(entry.games, 1),
        avgVisionScore: entry.visionScore / Math.max(entry.games, 1),
        uniqueChampions,
        mostPlayedChampion: mostPlayed ? mostPlayed[0] : null,
        mostPlayedChampionGames: mostPlayed ? mostPlayed[1] : 0,
      };
    });

    const teamRows = [...teamMap.values()].map((entry) => ({
      teamId: entry.teamId,
      teamName: entry.teamName,
      teamShortCode: entry.teamShortCode,
      teamLogoUrl: entry.teamLogoUrl,
      games: entry.games,
      wins: entry.wins,
      winRate: entry.games > 0 ? entry.wins / entry.games : 0,
      avgKills: entry.kills / (Math.max(entry.games, 1) * 5),
      avgDeaths: entry.deaths / (Math.max(entry.games, 1) * 5),
      teamKda: (entry.kills) / Math.max(entry.deaths, 1),
      blueSideGames: entry.blueSideGames,
      blueSideWinRate: entry.blueSideGames > 0 ? entry.blueSideWins / entry.blueSideGames : 0,
      redSideGames: entry.redSideGames,
      redSideWinRate: entry.redSideGames > 0 ? entry.redSideWins / entry.redSideGames : 0,
    }));

    const championRows = [...championMap.values()].map((entry) => ({
      champion: entry.champion,
      games: entry.games,
      wins: entry.wins,
      winRate: entry.games > 0 ? entry.wins / entry.games : 0,
      kda: (entry.kills + entry.assists) / Math.max(entry.deaths, 1),
      avgKills: entry.kills / Math.max(entry.games, 1),
      avgDeaths: entry.deaths / Math.max(entry.games, 1),
      avgAssists: entry.assists / Math.max(entry.games, 1),
    }));

    return {
      players: playerRows,
      teams: teamRows.sort((a, b) => b.winRate - a.winRate),
      champions: championRows.sort((a, b) => b.games - a.games),
    };
  }),

  fetchFromRiot: protectedProcedure
    .input(fetchFromRiotSchema)
    .mutation(async ({ ctx, input }) => {
      const player = await ctx.prisma.player.findUnique({
        where: { id: input.playerId },
        select: {
          id: true,
          gameName: true,
          tagLine: true,
          puuid: true,
          summonerId: true,
        },
      });

      if (!player) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Player not found.' });
      }

      let puuid = player.puuid;
      let accountMeta:
        | {
            cached: boolean;
            stale: boolean;
            updatedAt: string;
          }
        | null = null;

      if (!puuid) {
        try {
          const account = await getAccountByRiotId(player.gameName, player.tagLine);
          puuid = account.data;
          accountMeta = {
            cached: account.cached,
            stale: account.stale,
            updatedAt: account.updatedAt,
          };

          await ctx.prisma.player.update({
            where: { id: player.id },
            data: { puuid },
          });
        } catch (error) {
          mapRiotErrorToTRPC(error);
        }
      }

      if (!puuid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Unable to resolve a Riot PUUID for this player.',
        });
      }

      try {
        const history = await getMatchHistory(puuid, input.count);
        const matchResults = await Promise.all(
          history.data.map(async (matchId) => {
            const [detail, timeline] = await Promise.all([
              getMatchDetail(matchId),
              getMatchTimeline(matchId),
            ]);

            return {
              matchId,
              detail,
              timeline,
            };
          }),
        );

        const ranked = player.summonerId ? await getRankedInfo(player.summonerId) : null;

        return {
          playerId: player.id,
          puuid,
          accountMeta,
          history: {
            matchIds: history.data,
            cached: history.cached,
            stale: history.stale,
            updatedAt: history.updatedAt,
          },
          matches: matchResults.map((result) => ({
            matchId: result.matchId,
            detail: result.detail.data,
            detailMeta: {
              cached: result.detail.cached,
              stale: result.detail.stale,
              updatedAt: result.detail.updatedAt,
            },
            timeline: result.timeline.data,
            timelineMeta: {
              cached: result.timeline.cached,
              stale: result.timeline.stale,
              updatedAt: result.timeline.updatedAt,
            },
          })),
          ranked: ranked
            ? {
                data: ranked.data,
                cached: ranked.cached,
                stale: ranked.stale,
                updatedAt: ranked.updatedAt,
              }
            : null,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        mapRiotErrorToTRPC(error);
      }
    }),
});
