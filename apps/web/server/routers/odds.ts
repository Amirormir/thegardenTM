import { TRPCError } from '@trpc/server';
import {
  matchIdInputSchema,
  oddsForSplitSchema,
} from '@/lib/validators/betting';
import { createTRPCRouter, publicProcedure } from '@/server/trpc';

const teamSelect = {
  id: true,
  name: true,
  shortCode: true,
  logoUrl: true,
} as const;

export const oddsRouter = createTRPCRouter({
  getForMatch: publicProcedure.input(matchIdInputSchema).query(async ({ ctx, input }) => {
    const match = await ctx.prisma.match.findUnique({
      where: { id: input.matchId },
      select: {
        id: true,
        format: true,
        scheduledAt: true,
        isCompleted: true,
        homeTeam: { select: teamSelect },
        awayTeam: { select: teamSelect },
        odds: {
          select: { oddsHome: true, oddsAway: true, margin: true },
        },
      },
    });

    if (!match) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Match introuvable.' });
    }

    const hasOdds = match.odds !== null;
    const bettingOpen =
      hasOdds && !match.isCompleted && match.scheduledAt.getTime() > Date.now();

    return {
      matchId: match.id,
      format: match.format,
      scheduledAt: match.scheduledAt,
      isCompleted: match.isCompleted,
      bettingOpen,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      oddsHome: match.odds?.oddsHome ?? null,
      oddsAway: match.odds?.oddsAway ?? null,
    };
  }),

  getForSplit: publicProcedure.input(oddsForSplitSchema).query(async ({ ctx, input }) => {
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

    const matches = await ctx.prisma.match.findMany({
      where: {
        seasonId,
        isCompleted: false,
        odds: { isNot: null },
      },
      orderBy: { scheduledAt: 'asc' },
      select: {
        id: true,
        scheduledAt: true,
        odds: { select: { oddsHome: true, oddsAway: true } },
      },
    });

    const now = Date.now();

    return matches
      .filter((match) => match.odds !== null)
      .map((match) => ({
        matchId: match.id,
        oddsHome: match.odds?.oddsHome ?? null,
        oddsAway: match.odds?.oddsAway ?? null,
        bettingOpen: match.scheduledAt.getTime() > now,
      }));
  }),
});
