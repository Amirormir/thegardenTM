import { z } from 'zod';

export const playerStatsSchema = z.object({
  playerId: z.string().min(1),
});

export const fetchFromRiotSchema = z.object({
  playerId: z.string().min(1),
  count: z.number().int().positive().max(20).default(5),
});

export const auditLogSchema = z
  .object({
    limit: z.number().int().positive().max(100).default(25),
  })
  .default({
    limit: 25,
  });

export const scheduleSchema = z
  .object({
    teamId: z.string().min(1).optional(),
    seasonId: z.string().min(1).optional(),
  })
  .optional();
