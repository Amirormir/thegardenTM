import { TRPCError } from '@trpc/server';
import {
  scheduleSchema,
  seasonCreateSchema,
  seasonDeleteSchema,
  seasonUpdateSchema,
} from '@/lib/validators/stats';
import { buildAuditLogInput } from '@/server/utils/audit';
import { buildStandings } from '@/server/utils/standings';
import { adminProcedure, createTRPCRouter, publicProcedure } from '@/server/trpc';

export const leagueRouter = createTRPCRouter({
  getStandings: publicProcedure.query(({ ctx }) => buildStandings(ctx.prisma)),

  getCurrentSeason: publicProcedure.query(({ ctx }) =>
    ctx.prisma.season.findFirst({
      where: { isCurrent: true },
      select: {
        id: true,
        name: true,
        slug: true,
        year: true,
        startDate: true,
        endDate: true,
      },
    }),
  ),

  getAllSeasons: publicProcedure.query(({ ctx }) =>
    ctx.prisma.season.findMany({
      orderBy: { year: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        year: true,
        isCurrent: true,
        startDate: true,
        endDate: true,
        _count: {
          select: {
            matches: true,
          },
        },
      },
    }),
  ),

  getSchedule: publicProcedure.input(scheduleSchema).query(async ({ ctx, input }) => {
    const seasonId =
      input?.seasonId ??
      (
        await ctx.prisma.season.findFirst({
          where: { isCurrent: true },
          select: { id: true },
        })
      )?.id;

    if (!seasonId) {
      return [];
    }

    return ctx.prisma.match.findMany({
      where: {
        seasonId,
        ...(input?.teamId
          ? {
              OR: [{ homeTeamId: input.teamId }, { awayTeamId: input.teamId }],
            }
          : {}),
      },
      orderBy: { scheduledAt: 'asc' },
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
      },
    });
  }),

  createSeason: adminProcedure.input(seasonCreateSchema).mutation(async ({ ctx, input }) => {
    return ctx.prisma.$transaction(async (tx) => {
      if (input.isCurrent) {
        await tx.season.updateMany({
          where: { isCurrent: true },
          data: { isCurrent: false },
        });
      }

      const season = await tx.season.create({
        data: input,
        select: {
          id: true,
          name: true,
          slug: true,
          year: true,
          isCurrent: true,
        },
      });

      await tx.auditLog.create({
        data: buildAuditLogInput({
          userId: ctx.session.user.id,
          action: 'CREATE',
          entity: 'Season',
          entityId: season.id,
          details: { name: season.name },
        }),
      });

      return season;
    });
  }),

  updateSeason: adminProcedure.input(seasonUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const existing = await ctx.prisma.season.findUnique({
      where: { id },
      select: { id: true, name: true, isCurrent: true },
    });

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Season not found.' });
    }

    return ctx.prisma.$transaction(async (tx) => {
      if (data.isCurrent) {
        await tx.season.updateMany({
          where: { isCurrent: true, id: { not: id } },
          data: { isCurrent: false },
        });
      }

      const season = await tx.season.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name } : {}),
          ...(data.slug ? { slug: data.slug } : {}),
          ...(data.year !== undefined ? { year: data.year } : {}),
          ...(data.startDate ? { startDate: data.startDate } : {}),
          ...(data.endDate ? { endDate: data.endDate } : {}),
          ...(data.isCurrent !== undefined ? { isCurrent: data.isCurrent } : {}),
        },
        select: {
          id: true,
          name: true,
          slug: true,
          year: true,
          isCurrent: true,
        },
      });

      await tx.auditLog.create({
        data: buildAuditLogInput({
          userId: ctx.session.user.id,
          action: 'UPDATE',
          entity: 'Season',
          entityId: id,
          details: { before: existing, after: season },
        }),
      });

      return season;
    });
  }),

  deleteSeason: adminProcedure.input(seasonDeleteSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.season.findUnique({
      where: { id: input.id },
      select: { id: true, name: true },
    });

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Season not found.' });
    }

    await ctx.prisma.$transaction(async (tx) => {
      // Season is referenced with onDelete: Restrict by Match, Trophy and Draft.
      // Clear them first; deleting matches cascades to MatchGame, PlayerMatchStats,
      // Draft (and its actions/participants), so the explicit draft sweep is just
      // a safety net for orphans.
      await tx.trophy.deleteMany({ where: { seasonId: input.id } });
      await tx.match.deleteMany({ where: { seasonId: input.id } });
      await tx.draft.deleteMany({ where: { seasonId: input.id } });

      await tx.season.delete({ where: { id: input.id } });
      await tx.auditLog.create({
        data: buildAuditLogInput({
          userId: ctx.session.user.id,
          action: 'DELETE',
          entity: 'Season',
          entityId: input.id,
          details: { name: existing.name },
        }),
      });
    });

    return { success: true };
  }),
});
