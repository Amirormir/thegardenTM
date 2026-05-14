import { z } from 'zod';

export const articleSlugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const articleIdSchema = z.object({
  id: z.string().min(1),
});

export const articleSlugSchema = z.object({
  slug: z.string().min(1),
});

export const articleListInputSchema = z
  .object({
    limit: z.number().int().min(1).max(50).default(20),
    cursor: z.string().optional(),
    includeUnpublished: z.boolean().default(false),
  })
  .default({ limit: 20, includeUnpublished: false });

export const articleCreateSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(120)
    .regex(articleSlugRegex, 'Le slug doit être en minuscules, séparé par des tirets.'),
  title: z.string().min(3).max(180),
  excerpt: z.string().min(10).max(320),
  body: z.string().min(20).max(20000),
  coverImageUrl: z.string().url().optional(),
  isPublished: z.boolean().default(false),
  publishedAt: z.date().optional(),
});

export const articleUpdateSchema = articleCreateSchema.partial().extend({
  id: z.string().min(1),
});

export const articleSetFeaturedSchema = z.object({
  id: z.string().min(1).nullable(),
});
