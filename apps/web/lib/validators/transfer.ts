import { z } from 'zod';

export const transferOfferCreateSchema = z.object({
  playerId: z.string().min(1),
  fromTeamId: z.string().min(1),
  offeredFee: z.number().int().nonnegative(),
  message: z.string().max(500).optional(),
});

export const transferOfferRespondSchema = z.object({
  id: z.string().min(1),
  rejectionReason: z.string().max(500).optional(),
});

export const transferOfferIdSchema = z.object({
  id: z.string().min(1),
});

export const transferOffersByTeamSchema = z.object({
  teamId: z.string().min(1),
  direction: z.enum(['incoming', 'outgoing']).optional(),
});

export const transferCounterProposeSchema = z.object({
  id: z.string().min(1),
  counterOffer: z.number().int().positive(),
  counterMessage: z.string().max(500).optional(),
});
