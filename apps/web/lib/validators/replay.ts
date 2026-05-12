import { z } from 'zod';

const teamSideSchema = z.enum(['BLUE', 'RED']);
const matchResultSchema = z.enum(['WIN', 'LOSS']);
const playerRoleSchema = z.enum(['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT']);
const roflVersionSchema = z.enum(['ROFL', 'ROFL2']);

const prismaPlayerStatsSchema = z.object({
  champion: z.string(),
  kills: z.number().int().nonnegative(),
  deaths: z.number().int().nonnegative(),
  assists: z.number().int().nonnegative(),
  cs: z.number().int().nonnegative(),
  gold: z.number().int().nonnegative(),
  damage: z.number().int().nonnegative(),
  visionScore: z.number().int().nonnegative(),
  side: teamSideSchema,
  result: matchResultSchema,
});

const enrichedPlayerStatsSchema = z.object({
  kda: z.number(),
  cs_per_min: z.number(),
  gold_per_min: z.number(),
  damage_per_min: z.number(),
  damage_taken_per_min: z.number(),
  kill_participation: z.number(),
  damage_share: z.number(),
  gold_share: z.number(),
  physical_pct: z.number(),
  magic_pct: z.number(),
  true_pct: z.number(),
});

const playerStatsSchema = z.object({
  position_in_team: z.number().int().min(0).max(4),
  role: playerRoleSchema,
  side: teamSideSchema,
  riot_name: z.string().nullable(),
  champion_internal: z.string(),
  champion_display: z.string().nullable(),
  prisma: prismaPlayerStatsSchema,
  enriched: enrichedPlayerStatsSchema,
  raw_damage_taken: z.number().int().nonnegative(),
  raw_self_mitigated: z.number().int().nonnegative(),
});

const teamStatsSchema = z.object({
  side: teamSideSchema,
  result: matchResultSchema,
  total_kills: z.number().int().nonnegative(),
  total_gold: z.number().int().nonnegative(),
  total_damage: z.number().int().nonnegative(),
  total_damage_taken: z.number().int().nonnegative(),
  turret_kills: z.number().int().nonnegative(),
  dragon_kills: z.number().int().nonnegative(),
  baron_kills: z.number().int().nonnegative(),
  inhibitor_kills: z.number().int().nonnegative(),
});

const gameStatsSchema = z.object({
  duration_seconds: z.number().int().positive(),
  duration_minutes: z.number().positive(),
  game_version: z.string().nullable().optional(),
  game_mode: z.string().nullable().optional(),
  rofl_version: roflVersionSchema,
});

export const parsedReplaySchema = z
  .object({
    game: gameStatsSchema,
    teams: z.array(teamStatsSchema).length(2),
    players: z.array(playerStatsSchema).length(10),
  })
  .superRefine((value, ctx) => {
    for (const side of ['BLUE', 'RED'] as const) {
      const sidePlayers = value.players.filter((p) => p.side === side);
      if (sidePlayers.length !== 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Side ${side} must have exactly 5 players (got ${sidePlayers.length}).`,
          path: ['players'],
        });
      }
    }
  });

export type ParsedReplay = z.infer<typeof parsedReplaySchema>;
export type ParsedReplayPlayer = z.infer<typeof playerStatsSchema>;
export type ParsedReplayTeam = z.infer<typeof teamStatsSchema>;
