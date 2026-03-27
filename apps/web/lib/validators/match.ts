import { z } from 'zod';

export const matchFormatSchema = z.enum(['BO1', 'BO3', 'BO5']);

export const matchIdSchema = z.object({
  id: z.string().min(1),
});

export const matchByTeamSchema = z.object({
  teamId: z.string().min(1),
});

export const matchCreateSchema = z.object({
  seasonId: z.string().min(1),
  homeTeamId: z.string().min(1),
  awayTeamId: z.string().min(1),
  format: matchFormatSchema,
  scheduledAt: z.coerce.date(),
  notes: z.string().max(500).optional(),
});

export const matchUpdateSchema = z.object({
  id: z.string().min(1),
  seasonId: z.string().min(1).optional(),
  homeTeamId: z.string().min(1).optional(),
  awayTeamId: z.string().min(1).optional(),
  format: matchFormatSchema.optional(),
  scheduledAt: z.coerce.date().optional(),
  notes: z.string().max(500).optional(),
});

export const recordResultSchema = z.object({
  matchId: z.string().min(1),
  homeScore: z.number().int().nonnegative(),
  awayScore: z.number().int().nonnegative(),
  winnerTeamId: z.string().min(1).optional(),
  playedAt: z.coerce.date().optional(),
  games: z
    .array(
      z.object({
        gameNumber: z.number().int().positive(),
        riotMatchId: z.string().min(1).optional(),
        blueTeamId: z.string().min(1),
        redTeamId: z.string().min(1),
        winnerTeamId: z.string().min(1).optional(),
        playedAt: z.coerce.date().optional(),
        durationSeconds: z.number().int().positive().optional(),
      }),
    )
    .default([]),
});
