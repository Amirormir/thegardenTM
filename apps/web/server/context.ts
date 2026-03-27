import type { Session } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export interface TRPCContext {
  prisma: typeof prisma;
  session: Session | null;
}

export async function createTRPCContext(): Promise<TRPCContext> {
  const session = await auth();
  return {
    prisma,
    session,
  };
}
