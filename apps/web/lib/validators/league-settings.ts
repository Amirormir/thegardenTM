import { z } from 'zod';

export const leagueSettingsUpdateSchema = z
  .object({
    boMaxRegularSeason: z.number().int().positive().max(200).optional(),
    transferWindowOpen: z.boolean().optional(),
    transferWindowStart: z.coerce.date().nullish(),
    transferWindowEnd: z.coerce.date().nullish(),
    contractExpiryNoticeDays: z.number().int().min(0).max(365).optional(),
  })
  .refine(
    (data) => {
      if (data.transferWindowStart && data.transferWindowEnd) {
        return data.transferWindowEnd > data.transferWindowStart;
      }
      return true;
    },
    { message: 'transferWindowEnd doit etre posterieure a transferWindowStart.' },
  );

export type LeagueSettingsUpdateInput = z.infer<typeof leagueSettingsUpdateSchema>;
