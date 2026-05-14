import { TRPCError } from '@trpc/server';
import {
  articleCreateSchema,
  articleIdSchema,
  articleListInputSchema,
  articleSetFeaturedSchema,
  articleSlugSchema,
  articleUpdateSchema,
} from '@/lib/validators/article';
import { buildAuditLogInput } from '@/server/utils/audit';
import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
} from '@/server/trpc';

const publicSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverImageUrl: true,
  isFeatured: true,
  publishedAt: true,
  createdAt: true,
  author: {
    select: {
      id: true,
      name: true,
      image: true,
    },
  },
} as const;

const detailSelect = {
  ...publicSelect,
  body: true,
} as const;

const adminSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverImageUrl: true,
  isPublished: true,
  isFeatured: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

export const articleRouter = createTRPCRouter({
  getAll: publicProcedure.input(articleListInputSchema).query(async ({ ctx, input }) => {
    const { limit, cursor, includeUnpublished } = input;

    let cursorDate: Date | undefined;
    if (cursor) {
      const cursorRow = await ctx.prisma.article.findUnique({
        where: { id: cursor },
        select: { publishedAt: true, createdAt: true },
      });
      cursorDate = cursorRow?.publishedAt ?? cursorRow?.createdAt;
    }

    const items = await ctx.prisma.article.findMany({
      where: {
        ...(includeUnpublished ? {} : { isPublished: true }),
        ...(cursorDate !== undefined ? { publishedAt: { lt: cursorDate } } : {}),
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: limit + 1,
      select: publicSelect,
    });

    let nextCursor: string | undefined;
    if (items.length > limit) {
      const next = items.pop();
      nextCursor = next?.id;
    }

    return { items, nextCursor };
  }),

  getFeatured: publicProcedure.query(({ ctx }) =>
    ctx.prisma.article.findFirst({
      where: { isFeatured: true, isPublished: true },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      select: publicSelect,
    }),
  ),

  getBySlug: publicProcedure.input(articleSlugSchema).query(async ({ ctx, input }) => {
    const article = await ctx.prisma.article.findUnique({
      where: { slug: input.slug },
      select: detailSelect,
    });

    if (!article || !article.publishedAt) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Article introuvable.' });
    }

    return article;
  }),

  getAdminList: adminProcedure.query(({ ctx }) =>
    ctx.prisma.article.findMany({
      orderBy: [{ createdAt: 'desc' }],
      select: adminSelect,
    }),
  ),

  getAdminById: adminProcedure.input(articleIdSchema).query(async ({ ctx, input }) => {
    const article = await ctx.prisma.article.findUnique({
      where: { id: input.id },
      select: { ...adminSelect, body: true },
    });

    if (!article) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Article introuvable.' });
    }

    return article;
  }),

  create: adminProcedure.input(articleCreateSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.article.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });

    if (existing) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ce slug est déjà utilisé.' });
    }

    const publishedAt = input.isPublished ? (input.publishedAt ?? new Date()) : null;

    const article = await ctx.prisma.$transaction(async (tx) => {
      const created = await tx.article.create({
        data: {
          slug: input.slug,
          title: input.title,
          excerpt: input.excerpt,
          body: input.body,
          ...(input.coverImageUrl ? { coverImageUrl: input.coverImageUrl } : {}),
          isPublished: input.isPublished,
          ...(publishedAt ? { publishedAt } : {}),
          authorId: ctx.session.user.id,
        },
        select: adminSelect,
      });

      await tx.auditLog.create({
        data: buildAuditLogInput({
          userId: ctx.session.user.id,
          action: 'CREATE',
          entity: 'Article',
          entityId: created.id,
          details: { slug: created.slug, title: created.title },
        }),
      });

      return created;
    });

    return article;
  }),

  update: adminProcedure.input(articleUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const existing = await ctx.prisma.article.findUnique({
      where: { id },
      select: { id: true, slug: true, isPublished: true, publishedAt: true },
    });

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Article introuvable.' });
    }

    if (data.slug && data.slug !== existing.slug) {
      const slugConflict = await ctx.prisma.article.findUnique({
        where: { slug: data.slug },
        select: { id: true },
      });
      if (slugConflict) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ce slug est déjà utilisé.' });
      }
    }

    let nextPublishedAt: Date | null | undefined;
    if (data.isPublished !== undefined) {
      if (data.isPublished && !existing.publishedAt) {
        nextPublishedAt = data.publishedAt ?? new Date();
      } else if (!data.isPublished) {
        nextPublishedAt = null;
      }
    } else if (data.publishedAt !== undefined) {
      nextPublishedAt = data.publishedAt;
    }

    return ctx.prisma.$transaction(async (tx) => {
      const updated = await tx.article.update({
        where: { id },
        data: {
          ...(data.slug ? { slug: data.slug } : {}),
          ...(data.title ? { title: data.title } : {}),
          ...(data.excerpt ? { excerpt: data.excerpt } : {}),
          ...(data.body ? { body: data.body } : {}),
          ...(data.coverImageUrl !== undefined
            ? { coverImageUrl: data.coverImageUrl || null }
            : {}),
          ...(data.isPublished !== undefined ? { isPublished: data.isPublished } : {}),
          ...(nextPublishedAt !== undefined ? { publishedAt: nextPublishedAt } : {}),
        },
        select: adminSelect,
      });

      await tx.auditLog.create({
        data: buildAuditLogInput({
          userId: ctx.session.user.id,
          action: 'UPDATE',
          entity: 'Article',
          entityId: id,
          details: { slug: updated.slug, title: updated.title },
        }),
      });

      return updated;
    });
  }),

  delete: adminProcedure.input(articleIdSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.article.findUnique({
      where: { id: input.id },
      select: { id: true, slug: true, title: true },
    });

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Article introuvable.' });
    }

    await ctx.prisma.$transaction(async (tx) => {
      await tx.article.delete({ where: { id: input.id } });
      await tx.auditLog.create({
        data: buildAuditLogInput({
          userId: ctx.session.user.id,
          action: 'DELETE',
          entity: 'Article',
          entityId: input.id,
          details: { slug: existing.slug, title: existing.title },
        }),
      });
    });

    return { success: true };
  }),

  setFeatured: adminProcedure
    .input(articleSetFeaturedSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.id === null) {
        await ctx.prisma.$transaction(async (tx) => {
          await tx.article.updateMany({
            where: { isFeatured: true },
            data: { isFeatured: false },
          });
          await tx.auditLog.create({
            data: buildAuditLogInput({
              userId: ctx.session.user.id,
              action: 'UPDATE',
              entity: 'Article',
              entityId: 'featured',
              details: { featured: null },
            }),
          });
        });
        return { success: true, featuredId: null as string | null };
      }

      const target = await ctx.prisma.article.findUnique({
        where: { id: input.id },
        select: { id: true, isPublished: true, slug: true, title: true },
      });

      if (!target) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Article introuvable.' });
      }

      if (!target.isPublished) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Seul un article publié peut être mis en avant.',
        });
      }

      await ctx.prisma.$transaction(async (tx) => {
        await tx.article.updateMany({
          where: { isFeatured: true, NOT: { id: target.id } },
          data: { isFeatured: false },
        });
        await tx.article.update({
          where: { id: target.id },
          data: { isFeatured: true },
        });
        await tx.auditLog.create({
          data: buildAuditLogInput({
            userId: ctx.session.user.id,
            action: 'UPDATE',
            entity: 'Article',
            entityId: target.id,
            details: { featured: true, slug: target.slug, title: target.title },
          }),
        });
      });

      return { success: true, featuredId: target.id };
    }),
});
