import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { appRouter } from '@/server/routers/_app';

export const getPublicCaller = cache(() =>
  Promise.resolve(
    appRouter.createCaller({
      prisma,
      session: null,
    }),
  ),
);
