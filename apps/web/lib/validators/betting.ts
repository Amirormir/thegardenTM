import { z } from 'zod';

export const betStatusEnum = z.enum(['PENDING', 'WON', 'LOST', 'VOID']);

export const matchIdInputSchema = z.object({
  matchId: z.string().min(1),
});

export const oddsForSplitSchema = z
  .object({
    seasonId: z.string().min(1).optional(),
  })
  .optional();

export const betPlaceSchema = z.object({
  matchId: z.string().min(1),
  selectedTeamId: z.string().min(1),
  stake: z.number().int().positive(),
});

export const betListMineSchema = z
  .object({
    status: betStatusEnum.optional(),
    seasonId: z.string().min(1).optional(),
  })
  .optional();

// ----- Admin -----

export const seedRatingsSchema = z.object({
  seasonId: z.string().min(1),
  orderedTeamIds: z.array(z.string().min(1)).min(1),
  overrides: z.record(z.string(), z.number().finite()).optional(),
});

export const overrideRatingSchema = z.object({
  teamId: z.string().min(1),
  seasonId: z.string().min(1),
  rating: z.number().finite(),
});

export const updateSplitConfigSchema = z.object({
  seasonId: z.string().min(1),
  margin: z.number().min(0).max(1).optional(),
  k: z.number().min(0).max(200).optional(),
  warmupGames: z.number().int().min(0).max(50).optional(),
  seedRatingMin: z.number().finite().optional(),
  seedRatingMax: z.number().finite().optional(),
  probClampMin: z.number().min(0).max(0.5).optional(),
  probClampMax: z.number().min(0.5).max(1).optional(),
  minStake: z.number().int().min(1).optional(),
  maxStake: z.number().int().positive().nullable().optional(),
  allowSelfTeamBets: z.boolean().optional(),
});

export const seasonIdInputSchema = z.object({
  seasonId: z.string().min(1),
});

export const listBetsSchema = z
  .object({
    matchId: z.string().min(1).optional(),
    userId: z.string().min(1).optional(),
    status: betStatusEnum.optional(),
    seasonId: z.string().min(1).optional(),
    limit: z.number().int().min(1).max(200).default(100),
  })
  .default({ limit: 100 });
