import { TRPCError } from '@trpc/server';
import { getAccountByRiotId, getMatchDetail, getMatchHistory, getMatchTimeline, getRankedInfo } from '@/lib/riot';
import { fetchFromRiotSchema, playerStatsSchema } from '@/lib/validators/stats';
import { createTRPCRouter, protectedProcedure, publicProcedure } from '@/server/trpc';

export const statsRouter = createTRPCRouter({
  getPlayerStats: publicProcedure.input(playerStatsSchema).query(async ({ ctx, input }) => {
    const player = await ctx.prisma.player.findUnique({
      where: { id: input.playerId },
      select: {
        id: true,
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

    return {
      player,
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
      recentGames: stats.slice(0, 10),
    };
  }),

  getLeagueLeaders: publicProcedure.query(async ({ ctx }) => {
    const stats = await ctx.prisma.playerMatchStats.findMany({
      select: {
        playerId: true,
        kills: true,
        deaths: true,
        assists: true,
        cs: true,
        damage: true,
        player: {
          select: {
            id: true,
            gameName: true,
            role: true,
            team: {
              select: {
                name: true,
                shortCode: true,
              },
            },
          },
        },
      },
    });

    const leaderboard = new Map<
      string,
      {
        playerId: string;
        gameName: string;
        role: string;
        teamName: string;
        shortCode: string;
        games: number;
        kills: number;
        deaths: number;
        assists: number;
        cs: number;
        damage: number;
      }
    >();

    for (const stat of stats) {
      const current = leaderboard.get(stat.playerId) ?? {
        playerId: stat.player.id,
        gameName: stat.player.gameName,
        role: stat.player.role,
        teamName: stat.player.team.name,
        shortCode: stat.player.team.shortCode,
        games: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        cs: 0,
        damage: 0,
      };

      current.games += 1;
      current.kills += stat.kills;
      current.deaths += stat.deaths;
      current.assists += stat.assists;
      current.cs += stat.cs;
      current.damage += stat.damage;
      leaderboard.set(stat.playerId, current);
    }

    const rows = [...leaderboard.values()].map((entry) => ({
      ...entry,
      kda: (entry.kills + entry.assists) / Math.max(entry.deaths, 1),
      avgCs: entry.cs / Math.max(entry.games, 1),
      avgDamage: entry.damage / Math.max(entry.games, 1),
    }));

    return {
      kdaLeader: rows.sort((left, right) => right.kda - left.kda).slice(0, 5),
      csLeader: rows.sort((left, right) => right.avgCs - left.avgCs).slice(0, 5),
      damageLeader: rows.sort((left, right) => right.avgDamage - left.avgDamage).slice(0, 5),
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
      }

      if (!puuid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Unable to resolve a Riot PUUID for this player.',
        });
      }

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
    }),
});
