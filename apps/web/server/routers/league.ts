import { scheduleSchema } from '@/lib/validators/stats';
import { buildStandings } from '@/server/utils/standings';
import { createTRPCRouter, publicProcedure } from '@/server/trpc';

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
});
