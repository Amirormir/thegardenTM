import { z } from 'zod';

export const contractStatusSchema = z.enum(['ACTIVE', 'EXPIRED', 'TERMINATED', 'LOAN']);

export const contractPlayerSchema = z.object({
  playerId: z.string().min(1),
});

export const contractTeamSchema = z.object({
  teamId: z.string().min(1),
});

export const contractCreateSchema = z.object({
  playerId: z.string().min(1),
  teamId: z.string().min(1),
  status: contractStatusSchema.optional(),
  salary: z.number().int().nonnegative(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  transferFee: z.number().int().nonnegative().optional(),
  releaseClause: z.number().int().nonnegative().optional(),
  notes: z.string().max(500).optional(),
});

export const contractUpdateSchema = contractCreateSchema.partial().extend({
  id: z.string().min(1),
});

export const contractTerminateSchema = z.object({
  id: z.string().min(1),
  terminatedAt: z.coerce.date().optional(),
  reason: z.string().max(500).optional(),
});
