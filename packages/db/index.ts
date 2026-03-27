import { PrismaClient } from '@prisma/client';

declare global {
  var __nexusPrisma__: PrismaClient | undefined;
}

export const prisma = globalThis.__nexusPrisma__ ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__nexusPrisma__ = prisma;
}

export * from '@prisma/client';
