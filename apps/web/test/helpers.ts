import type { TRPCContext } from '@/server/context';
import { appRouter } from '@/server/routers/_app';

/**
 * Creates a mock Prisma client with vi.fn() stubs.
 * Each test should configure specific return values as needed.
 */
export function createMockPrisma() {
  const transactionFn = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
    callback(mockPrisma),
  );

  const mockPrisma: Record<string, unknown> = {
    $transaction: transactionFn,
    contract: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      delete: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(0),
    },
    transferOffer: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(0),
    },
    notification: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
    },
    team: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
    player: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    leagueSettings: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({
        id: 1,
        boMaxRegularSeason: 18,
        transferWindowOpen: true,
        transferWindowStart: null,
        transferWindowEnd: null,
        contractExpiryNoticeDays: 30,
        updatedAt: new Date(),
      }),
      update: vi.fn().mockResolvedValue({}),
    },
    budgetConversion: {
      create: vi.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };

  return mockPrisma as unknown as TRPCContext['prisma'];
}

interface CreateCallerOptions {
  prisma?: TRPCContext['prisma'];
  userId?: string;
  userRole?: string;
  teamId?: string | null;
}

/**
 * Creates a tRPC caller with a mocked context.
 */
export function createTestCaller(options: CreateCallerOptions = {}) {
  const {
    prisma = createMockPrisma(),
    userId = 'test-user',
    userRole = 'TEAM_CAPTAIN',
    teamId = 'test-team',
  } = options;

  const session = userId
    ? {
        user: {
          id: userId,
          name: 'Test User',
          email: 'test@test.com',
          role: userRole,
          teamId,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      }
    : null;

  const ctx: TRPCContext = {
    prisma,
    session: session as TRPCContext['session'],
  };

  return {
    caller: appRouter.createCaller(ctx),
    ctx,
    prisma,
  };
}

/**
 * Creates a caller with admin privileges.
 */
export function createAdminCaller(prisma?: TRPCContext['prisma']) {
  return createTestCaller({
    ...(prisma !== undefined ? { prisma } : {}),
    userId: 'admin-user',
    userRole: 'ADMIN',
    teamId: null,
  });
}

/**
 * Creates a caller with captain privileges.
 */
export function createCaptainCaller(teamId: string, prisma?: TRPCContext['prisma']) {
  return createTestCaller({
    ...(prisma !== undefined ? { prisma } : {}),
    userId: `captain-${teamId}`,
    userRole: 'TEAM_CAPTAIN',
    teamId,
  });
}

/**
 * Creates an unauthenticated caller.
 */
export function createPublicCaller(prisma?: TRPCContext['prisma']) {
  const p = prisma ?? createMockPrisma();
  const ctx: TRPCContext = { prisma: p, session: null };
  return {
    caller: appRouter.createCaller(ctx),
    ctx,
    prisma: p,
  };
}
