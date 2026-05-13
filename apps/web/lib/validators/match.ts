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

const recordedPlayerStatSchema = z.object({
  playerId: z.string().min(1),
  side: z.enum(['BLUE', 'RED']),
  champion: z.string().min(1).max(60),
  kills: z.number().int().nonnegative(),
  deaths: z.number().int().nonnegative(),
  assists: z.number().int().nonnegative(),
  cs: z.number().int().nonnegative(),
  gold: z.number().int().nonnegative(),
  damage: z.number().int().nonnegative(),
  visionScore: z.number().int().nonnegative(),
  kda: z.number().nonnegative(),
  csPerMin: z.number().nonnegative(),
  goldPerMin: z.number().nonnegative(),
  damagePerMin: z.number().nonnegative(),
  killParticipation: z.number().min(0).max(1),
  damageShare: z.number().min(0).max(1),
  goldShare: z.number().min(0).max(1),
  items: z.array(z.number().int().nonnegative()).length(7),
});

const recordedGameSchema = z
  .object({
    gameNumber: z.number().int().positive(),
    riotMatchId: z.string().min(1).optional(),
    blueTeamId: z.string().min(1),
    redTeamId: z.string().min(1),
    winnerTeamId: z.string().min(1).optional(),
    playedAt: z.coerce.date().optional(),
    durationSeconds: z.number().int().positive().optional(),
    playerStats: z.array(recordedPlayerStatSchema).max(10).default([]),
  })
  .superRefine((game, context) => {
    if (game.blueTeamId === game.redTeamId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Blue side and red side must be different teams.',
        path: ['redTeamId'],
      });
    }

    if (game.playerStats.length > 0 && !game.winnerTeamId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A game winner is required when player stats are provided.',
        path: ['winnerTeamId'],
      });
    }

    const uniquePlayerIds = new Set(game.playerStats.map((stat) => stat.playerId));
    if (uniquePlayerIds.size !== game.playerStats.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Each player can only appear once per game.',
        path: ['playerStats'],
      });
    }

    const bluePlayers = game.playerStats.filter((stat) => stat.side === 'BLUE').length;
    const redPlayers = game.playerStats.filter((stat) => stat.side === 'RED').length;

    if (game.playerStats.length > 0 && (bluePlayers === 0 || redPlayers === 0)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Both teams need player stats for a recorded game.',
        path: ['playerStats'],
      });
    }
  });

export const recordResultSchema = z
  .object({
    matchId: z.string().min(1),
    homeScore: z.number().int().nonnegative(),
    awayScore: z.number().int().nonnegative(),
    winnerTeamId: z.string().min(1).optional(),
    playedAt: z.coerce.date().optional(),
    games: z.array(recordedGameSchema).default([]),
  })
  .superRefine((input, context) => {
    if (input.games.length > 0 && input.homeScore + input.awayScore !== input.games.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Series score must match the number of recorded games.',
        path: ['games'],
      });
    }
  });
