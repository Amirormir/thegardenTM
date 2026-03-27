import { TRPCError } from '@trpc/server';
import { getAccountByRiotId } from '@/lib/riot';
import {
  playerByTeamSchema,
  playerCreateSchema,
  playerDeleteSchema,
  playerIdSchema,
  playerListQuerySchema,
  playerUpdateSchema,
  updateMarketValueSchema,
} from '@/lib/validators/player';
import { buildAuditLogInput } from '@/server/utils/audit';
import { adminProcedure, createTRPCRouter, publicProcedure } from '@/server/trpc';

async function resolvePuuid(gameName: string, tagLine: string, currentPuuid?: string) {
  if (currentPuuid) {
    return currentPuuid;
  }

  try {
    const account = await getAccountByRiotId(gameName, tagLine);
    return account.data;
  } catch {
    return null;
  }
}

export const playerRouter = createTRPCRouter({
  getAll: publicProcedure.input(playerListQuerySchema.optional()).query(async ({ ctx, input }) => {
    const search = input?.search?.trim();

    const orderBy =
      input?.sort === 'marketValue-asc'
        ? [{ marketValue: 'asc' as const }]
        : input?.sort === 'salary-desc'
          ? [{ salary: 'desc' as const }]
          : input?.sort === 'salary-asc'
            ? [{ salary: 'asc' as const }]
            : input?.sort === 'name-asc'
              ? [{ gameName: 'asc' as const }]
              : [{ marketValue: 'desc' as const }];

    const players = await ctx.prisma.player.findMany({
      where: {
        isActive: true,
        ...(input?.role ? { role: input.role } : {}),
        ...(search
          ? {
              OR: [
                { gameName: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { tagLine: { contains: search, mode: 'insensitive' } },
                {
                  team: {
                    name: { contains: search, mode: 'insensitive' },
                  },
                },
                {
                  team: {
                    shortCode: { contains: search, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        gameName: true,
        tagLine: true,
        role: true,
        marketValue: true,
        salary: true,
        teamId: true,
        team: {
          select: {
            name: true,
            shortCode: true,
          },
        },
        marketValueHistory: {
          orderBy: { changedAt: 'desc' },
          take: 1,
          select: {
            previousValue: true,
            newValue: true,
          },
        },
      },
    });

    return players.map((player) => ({
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      gameName: player.gameName,
      tagLine: player.tagLine,
      role: player.role,
      marketValue: player.marketValue,
      marketValueDelta:
        player.marketValueHistory[0]?.newValue !== undefined
          ? player.marketValueHistory[0].newValue - player.marketValueHistory[0].previousValue
          : 0,
      salary: player.salary,
      teamId: player.teamId,
      teamName: player.team.name,
      teamShortCode: player.team.shortCode,
    }));
  }),

  getById: publicProcedure.input(playerIdSchema).query(async ({ ctx, input }) => {
    const player = await ctx.prisma.player.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        slug: true,
        gameName: true,
        tagLine: true,
        puuid: true,
        summonerId: true,
        role: true,
        age: true,
        nationality: true,
        marketValue: true,
        salary: true,
        isActive: true,
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
            shortCode: true,
          },
        },
        contracts: {
          where: { status: 'ACTIVE' },
          orderBy: { startDate: 'desc' },
          take: 1,
          select: {
            id: true,
            salary: true,
            startDate: true,
            endDate: true,
            status: true,
            releaseClause: true,
            transferFee: true,
          },
        },
        marketValueHistory: {
          orderBy: { changedAt: 'desc' },
          take: 10,
          select: {
            id: true,
            previousValue: true,
            newValue: true,
            reason: true,
            changedAt: true,
            changedBy: {
              select: {
                name: true,
              },
            },
          },
        },
        playerMatchStats: {
          orderBy: { createdAt: 'desc' },
          take: 8,
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
                playedAt: true,
                match: {
                  select: {
                    id: true,
                    format: true,
                    scheduledAt: true,
                    homeScore: true,
                    awayScore: true,
                    isCompleted: true,
                    homeTeam: {
                      select: {
                        name: true,
                        shortCode: true,
                      },
                    },
                    awayTeam: {
                      select: {
                        name: true,
                        shortCode: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!player) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Player not found.' });
    }

    return player;
  }),

  getByTeam: publicProcedure.input(playerByTeamSchema).query(({ ctx, input }) =>
    ctx.prisma.player.findMany({
      where: { teamId: input.teamId },
      orderBy: [{ role: 'asc' }, { marketValue: 'desc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        gameName: true,
        tagLine: true,
        role: true,
        marketValue: true,
        salary: true,
        isActive: true,
      },
    }),
  ),

  create: adminProcedure.input(playerCreateSchema).mutation(async ({ ctx, input }) => {
    const puuid = await resolvePuuid(input.gameName, input.tagLine, input.puuid);

    return ctx.prisma.$transaction(async (tx) => {
      const player = await tx.player.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          slug: input.slug,
          gameName: input.gameName,
          tagLine: input.tagLine,
          role: input.role,
          teamId: input.teamId,
          marketValue: input.marketValue,
          salary: input.salary,
          ...(input.age !== undefined ? { age: input.age } : {}),
          ...(input.nationality ? { nationality: input.nationality } : {}),
          ...(puuid ? { puuid } : {}),
          ...(input.summonerId ? { summonerId: input.summonerId } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
        select: {
          id: true,
          gameName: true,
          tagLine: true,
          role: true,
          marketValue: true,
          salary: true,
        },
      });

      await tx.marketValueHistory.create({
        data: {
          playerId: player.id,
          previousValue: 0,
          newValue: input.marketValue,
          reason: 'Initial admin valuation',
          changedById: ctx.session.user.id,
        },
      });

      await tx.auditLog.create({
        data: buildAuditLogInput({
          userId: ctx.session.user.id,
          action: 'CREATE',
          entity: 'Player',
          entityId: player.id,
          details: {
            gameName: player.gameName,
            role: player.role,
            marketValue: player.marketValue,
          },
        }),
      });

      return player;
    });
  }),

  update: adminProcedure.input(playerUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const existing = await ctx.prisma.player.findUnique({
      where: { id },
      select: {
        id: true,
        gameName: true,
        tagLine: true,
        puuid: true,
        teamId: true,
        role: true,
        marketValue: true,
      },
    });

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Player not found.' });
    }

    const puuid =
      data.gameName || data.tagLine || data.puuid !== undefined
        ? await resolvePuuid(
            data.gameName ?? existing.gameName,
            data.tagLine ?? existing.tagLine,
            data.puuid ?? existing.puuid ?? undefined,
          )
        : existing.puuid;

    return ctx.prisma.$transaction(async (tx) => {
      const updatedPlayer = await tx.player.update({
        where: { id },
        data: {
          ...(data.firstName ? { firstName: data.firstName } : {}),
          ...(data.lastName ? { lastName: data.lastName } : {}),
          ...(data.slug ? { slug: data.slug } : {}),
          ...(data.gameName ? { gameName: data.gameName } : {}),
          ...(data.tagLine ? { tagLine: data.tagLine } : {}),
          ...(data.role ? { role: data.role } : {}),
          ...(data.teamId ? { teamId: data.teamId } : {}),
          ...(data.age !== undefined ? { age: data.age } : {}),
          ...(data.nationality ? { nationality: data.nationality } : {}),
          ...(data.marketValue !== undefined ? { marketValue: data.marketValue } : {}),
          ...(data.salary !== undefined ? { salary: data.salary } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          ...(puuid ? { puuid } : {}),
          ...(data.summonerId ? { summonerId: data.summonerId } : {}),
        },
        select: {
          id: true,
          gameName: true,
          role: true,
          teamId: true,
          marketValue: true,
        },
      });

      if (data.marketValue !== undefined && data.marketValue !== existing.marketValue) {
        await tx.marketValueHistory.create({
          data: {
            playerId: id,
            previousValue: existing.marketValue,
            newValue: data.marketValue,
            reason: 'Admin update from player router',
            changedById: ctx.session.user.id,
          },
        });
      }

      await tx.auditLog.create({
        data: buildAuditLogInput({
          userId: ctx.session.user.id,
          action: 'UPDATE',
          entity: 'Player',
          entityId: id,
          details: {
            before: existing,
            after: updatedPlayer,
          },
        }),
      });

      return updatedPlayer;
    });
  }),

  delete: adminProcedure.input(playerDeleteSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.player.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        gameName: true,
      },
    });

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Player not found.' });
    }

    await ctx.prisma.$transaction(async (tx) => {
      await tx.player.delete({ where: { id: input.id } });
      await tx.auditLog.create({
        data: buildAuditLogInput({
          userId: ctx.session.user.id,
          action: 'DELETE',
          entity: 'Player',
          entityId: input.id,
          details: {
            gameName: existing.gameName,
          },
        }),
      });
    });

    return { success: true };
  }),

  updateMarketValue: adminProcedure
    .input(updateMarketValueSchema)
    .mutation(async ({ ctx, input }) => {
      const player = await ctx.prisma.player.findUnique({
        where: { id: input.playerId },
        select: {
          id: true,
          marketValue: true,
        },
      });

      if (!player) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Player not found.' });
      }

      return ctx.prisma.$transaction(async (tx) => {
        const updated = await tx.player.update({
          where: { id: input.playerId },
          data: { marketValue: input.newValue },
          select: {
            id: true,
            marketValue: true,
          },
        });

        await tx.marketValueHistory.create({
          data: {
            playerId: input.playerId,
            previousValue: player.marketValue,
            newValue: input.newValue,
            reason: input.reason ?? 'Manual admin valuation update',
            changedById: ctx.session.user.id,
          },
        });

        await tx.auditLog.create({
          data: buildAuditLogInput({
            userId: ctx.session.user.id,
            action: 'UPDATE_MARKET_VALUE',
            entity: 'Player',
            entityId: input.playerId,
            details: {
              previousValue: player.marketValue,
              newValue: input.newValue,
              reason: input.reason ?? null,
            },
          }),
        });

        return updated;
      });
    }),
});
