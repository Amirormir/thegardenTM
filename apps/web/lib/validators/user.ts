import { z } from 'zod';

export const userUpdateProfileSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  image: z.string().url().optional().or(z.literal('')),
});
