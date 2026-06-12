import { TRPCError } from '@trpc/server';
import {
  betListMineSchema,
  betPlaceSchema,
  matchIdInputSchema,
} from '@/lib/validators/betting';
import { resolveBettingConfig } from '@/server/utils/betting/config';
import { debitWallet } from '@/server/utils/wallet';
import { createTRPCRouter, protectedProcedure } from '@/server/trpc';

const matchTeamSelect = {
  id: true,
  name: true,
  shortCode: true,
  logoUrl: true,
} as const;

const betWithMatchSelect = {
  id: true,
  stake: true,
  oddsAtBet: true,
  potentialPayout: true,
  status: true,
  placedAt: true,
  settledAt: true,
  selectedTeam: { select: matchTeamSelect },
  match: {
    select: {
      id: true,
      format: true,
      scheduledAt: true,
      isCompleted: true,
      winnerTeamId: true,
      seasonId: true,
      homeTeam: { select: matchTeamSelect },
      awayTeam: { select: matchTeamSelect },
    },
  },
} as const;

export const betRouter = createTRPCRouter({
  place: protectedProcedure.input(betPlaceSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;

    return ctx.prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({
        where: { id: input.matchId },
        select: {
          id: true,
          seasonId: true,
          homeTeamId: true,
          awayTeamId: true,
          isCompleted: true,
          scheduledAt: true,
          odds: { select: { oddsHome: true, oddsAway: true } },
        },
      });

      if (!match) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Match introuvable.' });
      }

      if (input.selectedTeamId !== match.homeTeamId && input.selectedTeamId !== match.awayTeamId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'L\'equipe selectionnee ne joue pas ce match.',
        });
      }

      const odds = match.odds;
      const bettingOpen =
        odds !== null && !match.isCompleted && match.scheduledAt.getTime() > Date.now();

      if (!bettingOpen || !odds) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Les paris sont fermes pour ce match.',
        });
      }

      const config = await resolveBettingConfig(tx, match.seasonId);

      if (input.stake < config.minStake) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `La mise minimale est de ${config.minStake}.`,
        });
      }

      if (config.maxStake !== null && input.stake > config.maxStake) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `La mise maximale est de ${config.maxStake}.`,
        });
      }

      if (!config.allowSelfTeamBets) {
        const me = await tx.user.findUnique({
          where: { id: userId },
          select: { captainOfTeamId: true, linkedPlayer: { select: { teamId: true } } },
        });
        const myTeamIds = new Set(
          [me?.captainOfTeamId, me?.linkedPlayer?.teamId].filter(
            (id): id is string => Boolean(id),
          ),
        );
        if (myTeamIds.has(match.homeTeamId) || myTeamIds.has(match.awayTeamId)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Les paris sur un match de ta propre equipe sont desactives.',
          });
        }
      }

      // Cote figee au moment du pari.
      const oddsAtBet =
        input.selectedTeamId === match.homeTeamId ? odds.oddsHome : odds.oddsAway;
      const potentialPayout = Math.round(input.stake * oddsAtBet);

      // 1) creer le pari (PENDING), 2) debiter le wallet (atomique, refuse si solde
      // insuffisant -> rollback du pari), 3) lier la transaction wallet au pari.
      const bet = await tx.bet.create({
        data: {
          userId,
          matchId: match.id,
          selectedTeamId: input.selectedTeamId,
          stake: input.stake,
          oddsAtBet,
          potentialPayout,
        },
        select: { id: true },
      });

      const { balanceAfter, txId } = await debitWallet(tx, {
        userId,
        amount: input.stake,
        type: 'BET_PLACED',
        reason: 'Mise pari',
        matchId: match.id,
        betId: bet.id,
      });

      await tx.bet.update({
        where: { id: bet.id },
        data: { walletTxId: txId },
      });

      return {
        betId: bet.id,
        stake: input.stake,
        oddsAtBet,
        potentialPayout,
        walletBalance: balanceAfter,
      };
    });
  }),

  listMine: protectedProcedure.input(betListMineSchema).query(({ ctx, input }) =>
    ctx.prisma.bet.findMany({
      where: {
        userId: ctx.session.user.id,
        ...(input?.status ? { status: input.status } : {}),
        ...(input?.seasonId ? { match: { seasonId: input.seasonId } } : {}),
      },
      orderBy: { placedAt: 'desc' },
      select: betWithMatchSelect,
    }),
  ),

  getMatchBetSummary: protectedProcedure
    .input(matchIdInputSchema)
    .query(async ({ ctx, input }) => {
      const bets = await ctx.prisma.bet.findMany({
        where: { userId: ctx.session.user.id, matchId: input.matchId },
        orderBy: { placedAt: 'desc' },
        select: {
          id: true,
          stake: true,
          oddsAtBet: true,
          potentialPayout: true,
          status: true,
          placedAt: true,
          selectedTeam: { select: matchTeamSelect },
        },
      });

      const totalStake = bets.reduce((sum, bet) => sum + bet.stake, 0);

      return { bets, totalStake };
    }),
});
