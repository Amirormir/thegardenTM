import { TRPCError, initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { buildRateLimitHeaders, checkRateLimit } from '@/lib/rate-limit';
import type { TRPCContext } from './context';

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user?.id) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

const enforceCaptain = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  if (!['ADMIN', 'TEAM_CAPTAIN'].includes(ctx.session.user.role)) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

const enforceAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  if (ctx.session.user.role !== 'ADMIN') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

const MUTATION_RATE_LIMIT_PER_MIN = 60;

const enforceMutationRateLimit = t.middleware(async ({ ctx, type, path, next }) => {
  if (type !== 'mutation' || !ctx.session?.user?.id) {
    return next();
  }

  const result = await checkRateLimit({
    identifier: ctx.session.user.id,
    scope: 'trpc:mutation',
    limit: MUTATION_RATE_LIMIT_PER_MIN,
    windowSeconds: 60,
  });

  if (!result.allowed) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many mutations. Slow down and try again shortly.',
      cause: { headers: buildRateLimitHeaders(result), path },
    });
  }

  return next();
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure
  .use(enforceUserIsAuthed)
  .use(enforceMutationRateLimit);
export const captainProcedure = t.procedure
  .use(enforceUserIsAuthed)
  .use(enforceCaptain)
  .use(enforceMutationRateLimit);
export const adminProcedure = t.procedure
  .use(enforceUserIsAuthed)
  .use(enforceAdmin)
  .use(enforceMutationRateLimit);
