import { z } from 'zod';

export const playerRoleSchema = z.enum(['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT']);

export const playerIdSchema = z.object({
  id: z.string().min(1),
});

export const playerByTeamSchema = z.object({
  teamId: z.string().min(1),
});

export const playerListQuerySchema = z.object({
  search: z.string().trim().min(1).max(50).optional(),
  role: playerRoleSchema.optional(),
  sort: z
    .enum(['marketValue-desc', 'marketValue-asc', 'salary-desc', 'salary-asc', 'name-asc'])
    .optional(),
});

export const playerCreateSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  slug: z.string().min(1).max(60),
  gameName: z.string().min(1).max(40),
  tagLine: z.string().min(1).max(10),
  role: playerRoleSchema,
  teamId: z.string().min(1),
  age: z.number().int().positive().max(99).optional(),
  nationality: z.string().min(2).max(50).optional(),
  marketValue: z.number().int().nonnegative(),
  salary: z.number().int().nonnegative(),
  puuid: z.string().min(1).optional(),
  summonerId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const playerUpdateSchema = playerCreateSchema.partial().extend({
  id: z.string().min(1),
});

export const playerDeleteSchema = z.object({
  id: z.string().min(1),
});

export const updateMarketValueSchema = z.object({
  playerId: z.string().min(1),
  newValue: z.number().int().nonnegative(),
  reason: z.string().min(1).max(255).optional(),
});
