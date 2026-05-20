import { z } from 'zod';

export const playerStatsSchema = z.object({
  playerId: z.string().min(1),
});

export const leagueStatsSchema = z
  .object({
    seasonId: z.string().min(1).optional(),
    role: z.enum(['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT']).optional(),
  })
  .optional();

export const championLeaderboardSchema = z
  .object({
    seasonId: z.string().min(1),
    role: z.enum(['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT']).optional(),
  });

export const playerLeaderboardSchema = z.object({
  seasonId: z.string().min(1),
  role: z.enum(['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT']).optional(),
});

export const teamLeaderboardSchema = z.object({
  seasonId: z.string().min(1),
});

export const seasonOverviewSchema = z.object({
  seasonId: z.string().min(1),
});

export const championDetailSchema = z.object({
  seasonId: z.string().min(1),
  championId: z.string().min(1),
});

export const teamDraftPreferencesSchema = z.object({
  seasonId: z.string().min(1),
  teamId: z.string().min(1),
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

export const seasonCreateSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z.string().min(1).max(80),
  year: z.number().int().positive(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isCurrent: z.boolean().default(false),
});

export const seasonUpdateSchema = seasonCreateSchema.partial().extend({
  id: z.string().min(1),
});

export const seasonDeleteSchema = z.object({
  id: z.string().min(1),
});
