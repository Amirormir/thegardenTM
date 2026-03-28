import { z } from 'zod';

export const notificationMarkReadSchema = z.object({
  id: z.string().min(1),
});

export const notificationMarkAllReadSchema = z.object({});
