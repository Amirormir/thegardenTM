import { z } from 'zod';

const playerRoleSchema = z.enum(['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT']);

export const championIdSchema = z.object({
  id: z.string().min(1).max(64),
});

export const championListInputSchema = z
  .object({
    onlyEnabled: z.boolean().optional(),
    search: z.string().max(64).optional(),
  })
  .optional();

export const championUpdateSchema = z.object({
  id: z.string().min(1).max(64),
  roles: z.array(playerRoleSchema).max(5).optional(),
  enabled: z.boolean().optional(),
});

export const championSyncSchema = z
  .object({
    force: z.boolean().optional(),
  })
  .optional();
