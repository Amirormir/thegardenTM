import type { Prisma } from '@nexus/db';
import { TRPCError } from '@trpc/server';

/**
 * Helpers wallet partages — encapsulent le pattern existant (User.walletBalance
 * + ledger WalletTransaction) pour ne PAS reimplementer le wallet ailleurs.
 * A utiliser dans une transaction Prisma (`tx`).
 */

interface WalletEntryInput {
  userId: string;
  /** Montant positif (la plus petite unite de la monnaie wallet). */
  amount: number;
  /** Categorie de transaction, ex. "BET_PLACED", "BET_WON", "BET_REFUND". */
  type: string;
  reason?: string;
  matchId?: string;
  playerId?: string;
  betId?: string;
}

export interface WalletEntryResult {
  balanceAfter: number;
  txId: string;
}

function assertPositiveAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Le montant doit etre un entier positif.',
    });
  }
}

/** Credite le wallet et enregistre une ligne de ledger (montant positif). */
export async function creditWallet(
  tx: Prisma.TransactionClient,
  input: WalletEntryInput,
): Promise<WalletEntryResult> {
  assertPositiveAmount(input.amount);

  const user = await tx.user.update({
    where: { id: input.userId },
    data: { walletBalance: { increment: input.amount } },
    select: { walletBalance: true },
  });

  const transaction = await tx.walletTransaction.create({
    data: {
      userId: input.userId,
      amount: input.amount,
      balanceAfter: user.walletBalance,
      type: input.type,
      ...(input.reason ? { reason: input.reason } : {}),
      ...(input.matchId ? { matchId: input.matchId } : {}),
      ...(input.playerId ? { playerId: input.playerId } : {}),
      ...(input.betId ? { betId: input.betId } : {}),
    },
    select: { id: true },
  });

  return { balanceAfter: user.walletBalance, txId: transaction.id };
}

/**
 * Debite le wallet de facon atomique et conditionnelle : l'update ne s'applique
 * que si `walletBalance >= amount`, ce qui interdit tout solde negatif meme en
 * cas de placements concurrents. Enregistre une ligne de ledger (montant negatif).
 * Leve BAD_REQUEST si le solde est insuffisant.
 */
export async function debitWallet(
  tx: Prisma.TransactionClient,
  input: WalletEntryInput,
): Promise<WalletEntryResult> {
  assertPositiveAmount(input.amount);

  const updated = await tx.user.updateMany({
    where: { id: input.userId, walletBalance: { gte: input.amount } },
    data: { walletBalance: { decrement: input.amount } },
  });

  if (updated.count === 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Solde insuffisant.',
    });
  }

  const user = await tx.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: { walletBalance: true },
  });

  const transaction = await tx.walletTransaction.create({
    data: {
      userId: input.userId,
      amount: -input.amount,
      balanceAfter: user.walletBalance,
      type: input.type,
      ...(input.reason ? { reason: input.reason } : {}),
      ...(input.matchId ? { matchId: input.matchId } : {}),
      ...(input.playerId ? { playerId: input.playerId } : {}),
      ...(input.betId ? { betId: input.betId } : {}),
    },
    select: { id: true },
  });

  return { balanceAfter: user.walletBalance, txId: transaction.id };
}
