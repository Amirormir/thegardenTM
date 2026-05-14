import { TRPCError } from '@trpc/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerCaller } from '@/server/caller';
import { renderArticleBody } from '@/lib/utils/article-format';
import { formatDateTime } from '@/lib/utils/format';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const caller = await getServerCaller();

  try {
    const article = await caller.article.getBySlug({ slug });
    return {
      title: `${article.title} — The Garden`,
      description: article.excerpt,
      openGraph: {
        title: article.title,
        description: article.excerpt,
        ...(article.coverImageUrl ? { images: [{ url: article.coverImageUrl }] } : {}),
        type: 'article',
      },
    };
  } catch {
    return { title: 'Article introuvable — The Garden' };
  }
}

export default async function NewsArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const caller = await getServerCaller();

  let article;
  try {
    article = await caller.article.getBySlug({ slug });
  } catch (error) {
    if (error instanceof TRPCError && error.code === 'NOT_FOUND') {
      notFound();
    }
    throw error;
  }

  const blocks = renderArticleBody(article.body);

  return (
    <article className="flex flex-col gap-12 md:gap-16">
      <header className="flex flex-col gap-6 border-b border-hairline pb-10">
        <Link
          href="/news"
          className="breadcrumb-mono transition-colors duration-150 hover:text-foreground"
        >
          § · News · Retour à la rédaction
        </Link>
        <h1 className="display-xl text-foreground">{article.title}</h1>
        <p className="max-w-3xl text-lg leading-8 text-foreground-dim md:text-xl md:leading-9">
          {article.excerpt}
        </p>
        <div className="flex flex-wrap items-center gap-3 label-mono text-foreground-muted">
          <span>{article.author.name ?? 'Rédaction'}</span>
          {article.publishedAt ? (
            <>
              <span>·</span>
              <span className="tabular-nums">{formatDateTime(article.publishedAt)}</span>
            </>
          ) : null}
        </div>
      </header>

      {article.coverImageUrl ? (
        <figure className="relative aspect-[16/9] w-full overflow-hidden border border-hairline bg-surface">
          <img
            src={article.coverImageUrl}
            alt={article.title}
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </figure>
      ) : null}

      <div className="mx-auto w-full max-w-3xl">
        <div className="flex flex-col gap-6 text-base leading-8 text-foreground-dim md:text-lg md:leading-9">
          {blocks.length > 0 ? blocks : <p>{article.body}</p>}
        </div>
      </div>

      <footer className="border-t border-hairline pt-8">
        <Link
          href="/news"
          className="label-mono transition-colors duration-150 hover:text-foreground"
        >
          ← Tous les articles
        </Link>
      </footer>
    </article>
  );
}
