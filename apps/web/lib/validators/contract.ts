import { z } from 'zod';

export const contractStatusSchema = z.enum([
  'PENDING_APPROVAL',
  'ACTIVE',
  'EXPIRED',
  'TERMINATED',
  'LOAN',
]);

export const PAYROLL_PROJECTION_MAX_HORIZON = 30;

export const contractPlayerSchema = z.object({
  playerId: z.string().min(1),
});

export const contractTeamSchema = z.object({
  teamId: z.string().min(1),
});

export const payrollProjectionSchema = z.object({
  teamId: z.string().min(1),
  horizon: z
    .number()
    .int()
    .min(1)
    .max(PAYROLL_PROJECTION_MAX_HORIZON)
    .default(20),
});

export const contractCreateSchema = z.object({
  playerId: z.string().min(1),
  teamId: z.string().min(1),
  salary: z.number().int().nonnegative(),
  durationBo3: z.number().int().min(5).max(18),
  releaseClause: z.number().int().positive(),
  transferFee: z.number().int().nonnegative().optional(),
  notes: z.string().max(500).optional(),
});

export const contractUpdateSchema = z.object({
  id: z.string().min(1),
  salary: z.number().int().nonnegative().optional(),
  durationBo3: z.number().int().min(5).max(18).optional(),
  releaseClause: z.number().int().positive().optional(),
  transferFee: z.number().int().nonnegative().optional(),
  notes: z.string().max(500).optional(),
});

export const contractApproveSchema = z.object({
  id: z.string().min(1),
});

export const contractRejectSchema = z.object({
  id: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export const contractAdminTerminateSchema = z.object({
  id: z.string().min(1),
  refundAmount: z.number().int().nonnegative().optional(),
  reason: z.string().max(500).optional(),
});

// Renewal = expire the current active contract + submit new terms for admin approval
export const contractRenewSchema = z.object({
  id: z.string().min(1),
  salary: z.number().int().nonnegative(),
  durationBo3: z.number().int().min(5).max(18),
  releaseClause: z.number().int().positive(),
  transferFee: z.number().int().nonnegative().optional(),
  notes: z.string().max(500).optional(),
});
