import { z } from 'zod';

export const matchFormatSchema = z.enum(['BO1', 'BO3', 'BO5']);
export const draftStatusSchema = z.enum([
  'LOBBY',
  'COINFLIP',
  'IN_PROGRESS',
  'PAUSED',
  'COMPLETED',
  'CANCELLED',
]);
export const draftSideSchema = z.enum(['BLUE', 'RED']);
export const draftParticipantRoleSchema = z.enum([
  'BLUE_CAPTAIN',
  'RED_CAPTAIN',
  'SPECTATOR',
  'ADMIN',
]);

export const draftIdSchema = z.object({
  id: z.string().min(1),
});

export const draftListInputSchema = z
  .object({
    status: z.array(draftStatusSchema).optional(),
    seasonId: z.string().min(1).optional(),
    teamId: z.string().min(1).optional(),
    format: matchFormatSchema.optional(),
    /** Restrict to a specific game number (typically 1 to dedupe BO3/BO5 series in lists). */
    gameNumber: z.number().int().min(1).max(5).optional(),
    limit: z.number().int().min(1).max(100).optional(),
    cursor: z.string().min(1).optional(),
  })
  .optional();

export const draftEligibleMatchesSchema = z
  .object({
    seasonId: z.string().min(1).optional(),
  })
  .optional();

export const draftCreateSchema = z.object({
  matchId: z.string().min(1),
  gameNumber: z.number().int().min(1).max(5),
  format: matchFormatSchema.optional(),
  fearless: z.boolean().default(true),
  blueSide: z.enum(['HOME', 'AWAY']),
});

export type DraftListInput = z.infer<typeof draftListInputSchema>;
export type DraftCreateInput = z.infer<typeof draftCreateSchema>;
export type DraftStatus = z.infer<typeof draftStatusSchema>;
