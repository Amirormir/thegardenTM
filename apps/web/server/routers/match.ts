import { TRPCError } from '@trpc/server';
import {
  matchByTeamSchema,
  matchCreateSchema,
  matchIdSchema,
  matchUpdateSchema,
  recordResultSchema,
} from '@/lib/validators/match';
import { buildAuditLogInput } from '@/server/utils/audit';
import { adminProcedure, createTRPCRouter, publicProcedure } from '@/server/trpc';

export const matchRouter = createTRPCRouter({
  getAll: publicProcedure.query(({ ctx }) =>
    ctx.prisma.match.findMany({
      orderBy: { scheduledAt: 'desc' },
      select: {
        id: true,
        format: true,
        scheduledAt: true,
        playedAt: true,
        isCompleted: true,
        homeScore: true,
        awayScore: true,
        homeTeam: {
          select: {
            id: true,
            name: true,
            shortCode: true,
          },
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            shortCode: true,
          },
        },
        season: {
          select: {
            id: true,
            name: true,
            isCurrent: true,
          },
        },
      },
    }),
  ),

  getById: publicProcedure.input(matchIdSchema).query(async ({ ctx, input }) => {
    const match = await ctx.prisma.match.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        format: true,
        scheduledAt: true,
        playedAt: true,
        isCompleted: true,
        homeScore: true,
        awayScore: true,
        notes: true,
        homeTeam: {
          select: {
            id: true,
            name: true,
            shortCode: true,
          },
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            shortCode: true,
          },
        },
        season: {
          select: {
            id: true,
            name: true,
          },
        },
        games: {
          orderBy: { gameNumber: 'asc' },
          select: {
            id: true,
            gameNumber: true,
            riotMatchId: true,
            durationSeconds: true,
            playedAt: true,
            blueTeamId: true,
            redTeamId: true,
            winnerTeamId: true,
            playerStats: {
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
                side: true,
                result: true,
                player: {
                  select: {
                    id: true,
                    gameName: true,
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!match) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Match not found.' });
    }

    return match;
  }),

  getByTeam: publicProcedure.input(matchByTeamSchema).query(({ ctx, input }) =>
    ctx.prisma.match.findMany({
      where: {
        OR: [{ homeTeamId: input.teamId }, { awayTeamId: input.teamId }],
      },
      orderBy: { scheduledAt: 'desc' },
      select: {
        id: true,
        format: true,
        scheduledAt: true,
        playedAt: true,
        isCompleted: true,
        homeScore: true,
        awayScore: true,
        homeTeam: {
          select: {
            id: true,
            name: true,
          },
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  ),

  create: adminProcedure.input(matchCreateSchema).mutation(async ({ ctx, input }) => {
    const match = await ctx.prisma.$transaction(async (tx) => {
      const created = await tx.match.create({
        data: {
          seasonId: input.seasonId,
          homeTeamId: input.homeTeamId,
          awayTeamId: input.awayTeamId,
          format: input.format,
          scheduledAt: input.scheduledAt,
          ...(input.notes ? { notes: input.notes } : {}),
        },
        select: {
          id: true,
          seasonId: true,
          homeTeamId: true,
          awayTeamId: true,
          format: true,
          scheduledAt: true,
        },
      });

      await tx.auditLog.create({
        data: buildAuditLogInput({
          userId: ctx.session.user.id,
          action: 'CREATE',
          entity: 'Match',
          entityId: created.id,
          details: {
            seasonId: created.seasonId,
            format: created.format,
          },
        }),
      });

      return created;
    });

    return match;
  }),

  update: adminProcedure.input(matchUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const existing = await ctx.prisma.match.findUnique({
      where: { id },
      select: {
        id: true,
        seasonId: true,
        homeTeamId: true,
        awayTeamId: true,
        format: true,
        scheduledAt: true,
        notes: true,
      },
    });

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Match not found.' });
    }

    return ctx.prisma.$transaction(async (tx) => {
      const updated = await tx.match.update({
        where: { id },
        data: {
          ...(data.seasonId ? { seasonId: data.seasonId } : {}),
          ...(data.homeTeamId ? { homeTeamId: data.homeTeamId } : {}),
          ...(data.awayTeamId ? { awayTeamId: data.awayTeamId } : {}),
          ...(data.format ? { format: data.format } : {}),
          ...(data.scheduledAt ? { scheduledAt: data.scheduledAt } : {}),
          ...(data.notes ? { notes: data.notes } : {}),
        },
        select: {
          id: true,
          seasonId: true,
          homeTeamId: true,
          awayTeamId: true,
          format: true,
          scheduledAt: true,
        },
      });

      await tx.auditLog.create({
        data: buildAuditLogInput({
          userId: ctx.session.user.id,
          action: 'UPDATE',
          entity: 'Match',
          entityId: id,
          details: {
            before: existing,
            after: updated,
          },
        }),
      });

      return updated;
    });
  }),

  recordResult: adminProcedure.input(recordResultSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.match.findUnique({
      where: { id: input.matchId },
      select: {
        id: true,
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
        winnerTeamId: true,
      },
    });

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Match not found.' });
    }

    const allowedTeamIds = new Set([existing.homeTeamId, existing.awayTeamId]);

    if (input.winnerTeamId && !allowedTeamIds.has(input.winnerTeamId)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'The selected series winner does not belong to this match.',
      });
    }

    for (const game of input.games) {
      if (!allowedTeamIds.has(game.blueTeamId) || !allowedTeamIds.has(game.redTeamId)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'A recorded game references a team outside of the match.',
        });
      }

      if (game.winnerTeamId && ![game.blueTeamId, game.redTeamId].includes(game.winnerTeamId)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'A recorded game winner must be one of the teams playing that game.',
        });
      }
    }

    const playerIds = [...new Set(input.games.flatMap((game) => game.playerStats.map((stat) => stat.playerId)))];
    const playersById = new Map<
      string,
      {
        id: string;
        teamId: string | null;
      }
    >();

    if (playerIds.length > 0) {
      const players = await ctx.prisma.player.findMany({
        where: {
          id: { in: playerIds },
        },
        select: {
          id: true,
          teamId: true,
        },
      });

      for (const player of players) {
        playersById.set(player.id, player);
      }

      if (players.length !== playerIds.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'One or more selected players could not be found.',
        });
      }
    }

    return ctx.prisma.$transaction(async (tx) => {
      await tx.matchGame.deleteMany({
        where: { matchId: input.matchId },
      });

      for (const game of input.games) {
        const createdGame = await tx.matchGame.create({
          data: {
            matchId: input.matchId,
            gameNumber: game.gameNumber,
            ...(game.riotMatchId ? { riotMatchId: game.riotMatchId } : {}),
            blueTeamId: game.blueTeamId,
            redTeamId: game.redTeamId,
            ...(game.winnerTeamId ? { winnerTeamId: game.winnerTeamId } : {}),
            ...(game.playedAt ? { playedAt: game.playedAt } : {}),
            ...(game.durationSeconds ? { durationSeconds: game.durationSeconds } : {}),
          },
          select: {
            id: true,
          },
        });

        if (game.playerStats.length > 0) {
          const playerStatsData = game.playerStats.map((stat) => {
            const teamId = stat.side === 'BLUE' ? game.blueTeamId : game.redTeamId;
            const player = playersById.get(stat.playerId);

            if (!player || player.teamId !== teamId) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'A selected player is not assigned to the expected team roster.',
              });
            }

            if (!game.winnerTeamId) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'A game winner is required before saving player stats.',
              });
            }

            return {
              playerId: stat.playerId,
              matchGameId: createdGame.id,
              teamId,
              champion: stat.champion,
              kills: stat.kills,
              deaths: stat.deaths,
              assists: stat.assists,
              cs: stat.cs,
              gold: stat.gold,
              damage: stat.damage,
              visionScore: stat.visionScore,
              side: stat.side,
              result: game.winnerTeamId === teamId ? 'WIN' as const : 'LOSS' as const,
            };
          });

          await tx.playerMatchStats.createMany({
            data: playerStatsData,
          });
        }
      }

      const match = await tx.match.update({
        where: { id: input.matchId },
        data: {
          homeScore: input.homeScore,
          awayScore: input.awayScore,
          winnerTeamId: input.winnerTeamId ?? null,
          playedAt: input.playedAt ?? new Date(),
          isCompleted: true,
        },
        select: {
          id: true,
          homeScore: true,
          awayScore: true,
          winnerTeamId: true,
          isCompleted: true,
        },
      });

      await tx.auditLog.create({
        data: buildAuditLogInput({
          userId: ctx.session.user.id,
          action: 'RECORD_RESULT',
          entity: 'Match',
          entityId: input.matchId,
          details: {
            before: existing,
            after: match,
            gameCount: input.games.length,
            playerStatCount: input.games.reduce(
              (total, game) => total + game.playerStats.length,
              0,
            ),
          },
        }),
      });

      return match;
    });
  }),
});
