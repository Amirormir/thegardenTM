import { z } from 'zod';

export const teamIdSchema = z.object({
  id: z.string().min(1),
});

export const teamSlugSchema = z.object({
  slug: z.string().min(1),
});

export const standingsInputSchema = z
  .object({
    seasonId: z.string().min(1).optional(),
  })
  .optional();

export const teamCreateSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z.string().min(1).max(80),
  shortCode: z.string().min(2).max(8),
  logoUrl: z.string().url().optional(),
  transferBudget: z.number().int().nonnegative().optional(),
  salaryBudgetCap: z.number().int().nonnegative().optional(),
});

export const teamUpdateSchema = teamCreateSchema.partial().extend({
  id: z.string().min(1),
});

export const teamCaptainCandidatesSchema = z
  .object({
    teamId: z.string().min(1).optional(),
  })
  .optional();

export const teamDeleteSchema = z.object({
  id: z.string().min(1),
});

export const teamUpdatePlayerRoleSchema = z.object({
  playerId: z.string().min(1),
  teamRole: z.enum(['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT']),
});

export const teamBudgetConvertSchema = z.object({
  teamId: z.string().min(1),
  direction: z.enum(['TRANSFER_TO_SALARY', 'SALARY_TO_TRANSFER']),
  amount: z.number().int().positive(),
});

export const teamBudgetSnapshotSchema = z.object({
  teamId: z.string().min(1),
});

export const teamRecentActivitySchema = z.object({
  teamId: z.string().min(1),
});
