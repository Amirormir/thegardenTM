import { z } from 'zod';

export const teamIdSchema = z.object({
  id: z.string().min(1),
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
  budget: z.number().int().positive().optional(),
  captainId: z.string().min(1).optional(),
});

export const teamUpdateSchema = teamCreateSchema.partial().extend({
  id: z.string().min(1),
});

export const teamDeleteSchema = z.object({
  id: z.string().min(1),
});
