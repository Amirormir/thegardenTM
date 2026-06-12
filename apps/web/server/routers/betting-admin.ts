import { TRPCError } from '@trpc/server';
import {
  listBetsSchema,
  matchIdInputSchema,
  overrideRatingSchema,
  seasonIdInputSchema,
  seedRatingsSchema,
  updateSplitConfigSchema,
} from '@/lib/validators/betting';
import { resolveBettingConfig } from '@/server/utils/betting/config';
import { seedRatings as computeSeedRatings } from '@/server/utils/betting/odds-engine';
import {
  recomputeOddsForSeason,
  recomputeOddsForTeams,
} from '@/server/utils/betting/recompute';
import { creditWallet } from '@/server/utils/wallet';
import { buildAuditLogInput } from '@/server/utils/audit';
import { adminProcedure, createTRPCRouter } from '@/server/trpc';

export const bettingAdminRouter = createTRPCRouter({
  getConfig: adminProcedure.input(seasonIdInputSchema).query(async ({ ctx, input }) => {
    const config = await resolveBettingConfig(ctx.prisma, input.seasonId);
    const row = await ctx.prisma.bettingConfig.findUnique({
      where: { seasonId: input.seasonId },
      select: { seasonId: true },
    });
    return { ...config, exists: row !== null };
  }),

  updateConfig: adminProcedure
    .input(updateSplitConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const { seasonId, ...patch } = input;
      const current = await resolveBettingConfig(ctx.prisma, seasonId);
      const merged = {
        margin: patch.margin ?? current.margin,
        k: patch.k ?? current.k,
        warmupGames: patch.warmupGames ?? current.warmupGames,
        seedRatingMin: patch.seedRatingMin ?? current.seedRatingMin,
        seedRatingMax: patch.seedRatingMax ?? current.seedRatingMax,
        probClampMin: patch.probClampMin ?? current.probClampMin,
        probClampMax: patch.probClampMax ?? current.probClampMax,
        minStake: patch.minStake ?? current.minStake,
        maxStake: patch.maxStake === undefined ? current.maxStake : patch.maxStake,
        allowSelfTeamBets: patch.allowSelfTeamBets ?? current.allowSelfTeamBets,
      };

      if (merged.seedRatingMax <= merged.seedRatingMin) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'SEED_RATING_MAX doit etre superieur a SEED_RATING_MIN.',
        });
      }
      if (merged.probClampMax <= merged.probClampMin) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'La borne haute de proba doit etre superieure a la borne basse.',
        });
      }

      const result = await ctx.prisma.$transaction(async (tx) => {
        const saved = await tx.bettingConfig.upsert({
          where: { seasonId },
          create: { seasonId, ...merged },
          update: { ...merged },
        });

        // La config impacte les cotes -> on recalcule les matchs a venir.
        await recomputeOddsForSeason(tx, seasonId);

        await tx.auditLog.create({
          data: buildAuditLogInput({
            userId: ctx.session.user.id,
            action: 'UPDATE',
            entity: 'BettingConfig',
            entityId: seasonId,
            details: { before: current, after: merged },
          }),
        });

        return saved;
      });

      return result;
    }),

  getRatings: adminProcedure.input(seasonIdInputSchema).query(async ({ ctx, input }) => {
    const teams = await ctx.prisma.team.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        shortCode: true,
        logoUrl: true,
        teamRatings: {
          where: { seasonId: input.seasonId },
          select: { seedRating: true, rating: true, gamesPlayed: true },
        },
      },
    });

    return teams.map((team) => {
      const rating = team.teamRatings[0] ?? null;
      return {
        teamId: team.id,
        name: team.name,
        shortCode: team.shortCode,
        logoUrl: team.logoUrl,
        seedRating: rating?.seedRating ?? null,
        rating: rating?.rating ?? null,
        gamesPlayed: rating?.gamesPlayed ?? 0,
      };
    });
  }),

  seedRatings: adminProcedure.input(seedRatingsSchema).mutation(async ({ ctx, input }) => {
    const config = await resolveBettingConfig(ctx.prisma, input.seasonId);

    const teams = await ctx.prisma.team.findMany({
      where: { id: { in: input.orderedTeamIds } },
      select: { id: true },
    });
    if (teams.length !== input.orderedTeamIds.length) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Une ou plusieurs equipes sont introuvables.',
      });
    }

    const ratings = computeSeedRatings(input.orderedTeamIds, {
      seedMin: config.seedRatingMin,
      seedMax: config.seedRatingMax,
      ...(input.overrides ? { overrides: input.overrides } : {}),
    });

    await ctx.prisma.$transaction(async (tx) => {
      for (const [teamId, rating] of ratings) {
        // Seeding -> rating courant = seedRating, compteur de matchs remis a zero.
        await tx.teamRating.upsert({
          where: { teamId_seasonId: { teamId, seasonId: input.seasonId } },
          create: {
            teamId,
            seasonId: input.seasonId,
            seedRating: rating,
            rating,
            gamesPlayed: 0,
          },
          update: { seedRating: rating, rating, gamesPlayed: 0 },
        });
      }

      await recomputeOddsForSeason(tx, input.seasonId);

      await tx.auditLog.create({
        data: buildAuditLogInput({
          userId: ctx.session.user.id,
          action: 'SEED_RATINGS',
          entity: 'Season',
          entityId: input.seasonId,
          details: { ratings: Object.fromEntries(ratings) },
        }),
      });
    });

    return { success: true, count: ratings.size };
  }),

  overrideRating: adminProcedure
    .input(overrideRatingSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.teamRating.findUnique({
        where: { teamId_seasonId: { teamId: input.teamId, seasonId: input.seasonId } },
        select: { rating: true },
      });

      await ctx.prisma.$transaction(async (tx) => {
        await tx.teamRating.upsert({
          where: { teamId_seasonId: { teamId: input.teamId, seasonId: input.seasonId } },
          create: {
            teamId: input.teamId,
            seasonId: input.seasonId,
            seedRating: input.rating,
            rating: input.rating,
            gamesPlayed: 0,
          },
          update: { rating: input.rating },
        });

        await recomputeOddsForTeams(tx, input.seasonId, [input.teamId]);

        await tx.auditLog.create({
          data: buildAuditLogInput({
            userId: ctx.session.user.id,
            action: 'OVERRIDE_RATING',
            entity: 'TeamRating',
            entityId: `${input.teamId}:${input.seasonId}`,
            details: { previousRating: existing?.rating ?? null, newRating: input.rating },
          }),
        });
      });

      return { success: true };
    }),

  listBets: adminProcedure.input(listBetsSchema).query(({ ctx, input }) =>
    ctx.prisma.bet.findMany({
      where: {
        ...(input.matchId ? { matchId: input.matchId } : {}),
        ...(input.userId ? { userId: input.userId } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.seasonId ? { match: { seasonId: input.seasonId } } : {}),
      },
      orderBy: { placedAt: 'desc' },
      take: input.limit,
      select: {
        id: true,
        stake: true,
        oddsAtBet: true,
        potentialPayout: true,
        status: true,
        placedAt: true,
        settledAt: true,
        user: { select: { id: true, name: true, email: true } },
        selectedTeam: { select: { id: true, name: true, shortCode: true } },
        match: {
          select: {
            id: true,
            scheduledAt: true,
            homeTeam: { select: { shortCode: true } },
            awayTeam: { select: { shortCode: true } },
          },
        },
      },
    }),
  ),

  voidBetsForMatch: adminProcedure
    .input(matchIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.$transaction(async (tx) => {
        const pendingBets = await tx.bet.findMany({
          where: { matchId: input.matchId, status: 'PENDING' },
          select: { id: true, userId: true, stake: true },
        });

        for (const bet of pendingBets) {
          // Remboursement de la mise (idempotent : seuls les PENDING sont traites).
          await creditWallet(tx, {
            userId: bet.userId,
            amount: bet.stake,
            type: 'BET_REFUND',
            reason: 'Remboursement pari annule',
            matchId: input.matchId,
            betId: bet.id,
          });

          await tx.bet.update({
            where: { id: bet.id },
            data: { status: 'VOID', settledAt: new Date() },
          });
        }

        await tx.auditLog.create({
          data: buildAuditLogInput({
            userId: ctx.session.user.id,
            action: 'VOID_BETS',
            entity: 'Match',
            entityId: input.matchId,
            details: { voidedCount: pendingBets.length },
          }),
        });

        return { voidedCount: pendingBets.length };
      });

      return result;
    }),
});
