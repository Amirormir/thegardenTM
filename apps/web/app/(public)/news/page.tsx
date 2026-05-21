import Image from 'next/image';
import Link from 'next/link';
import { formatCompactDate } from '@/lib/utils/format';
import { getOptimizedRemoteImageUrl } from '@/lib/utils/optimized-image';
import { getNewsIndexSnapshot } from '@/server/public/page-data';

export const revalidate = 60;

export const metadata = {
  title: 'News — The Garden',
  description: 'Toute l’actualité de la ligue, racontée par la rédaction.',
};

export default async function NewsIndexPage() {
  const { featured, rest } = await getNewsIndexSnapshot();

  return (
    <div className="flex flex-col gap-16 md:gap-20">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ · News · Rédaction</p>
        <h1 className="mt-4 display-xl text-foreground">L&apos;actu de la ligue.</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-foreground-dim">
          Articles, analyses et coulisses signés par la rédaction.
        </p>
      </header>

      {featured ? (
        <Link
          href={`/news/${featured.slug}`}
          className="group grid gap-8 border-b border-hairline pb-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12"
        >
          <div className="relative aspect-[16/10] overflow-hidden border border-hairline bg-surface">
            {featured.coverImageUrl ? (
              <Image
                src={
                  getOptimizedRemoteImageUrl(featured.coverImageUrl, { width: 1600 }) ??
                  featured.coverImageUrl
                }
                alt={featured.title}
                fill
                priority
                sizes="(min-width: 1024px) 52vw, 100vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center label-mono text-foreground-muted">
                Sans image
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center">
            <p className="breadcrumb-mono">§ 01 · À la une</p>
            <h2 className="mt-4 display-lg text-foreground transition-colors duration-150 group-hover:text-accent">
              {featured.title}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-foreground-dim md:text-lg md:leading-8">
              {featured.excerpt}
            </p>
            <div className="mt-6 flex items-center gap-3 label-mono text-foreground-muted">
              <span>{featured.author.name ?? 'Rédaction'}</span>
              {featured.publishedAt ? (
                <>
                  <span>·</span>
                  <span className="tabular-nums">{formatCompactDate(featured.publishedAt)}</span>
                </>
              ) : null}
            </div>
          </div>
        </Link>
      ) : null}

      <section>
        <p className="label-mono">§ Tous les articles</p>
        <h2 className="mt-3 display-md text-foreground">Le fil de la rédaction.</h2>

        {rest.length > 0 ? (
          <ul className="mt-10 grid gap-x-10 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((article) => (
              <li key={article.id} className="flex flex-col">
                <Link href={`/news/${article.slug}`} className="group flex flex-col gap-4">
                  <div className="relative aspect-[16/10] overflow-hidden border border-hairline bg-surface">
                    {article.coverImageUrl ? (
                      <Image
                        src={
                          getOptimizedRemoteImageUrl(article.coverImageUrl, { width: 960 }) ??
                          article.coverImageUrl
                        }
                        alt={article.title}
                        fill
                        sizes="(min-width: 1280px) 28vw, (min-width: 768px) 44vw, 100vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center label-mono text-foreground-muted">
                        Sans image
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 label-mono text-foreground-muted">
                      <span>{article.author.name ?? 'Rédaction'}</span>
                      {article.publishedAt ? (
                        <>
                          <span>·</span>
                          <span className="tabular-nums">
                            {formatCompactDate(article.publishedAt)}
                          </span>
                        </>
                      ) : null}
                    </div>
                    <h3 className="mt-3 font-display text-2xl leading-tight tracking-tight text-foreground transition-colors duration-150 group-hover:text-accent">
                      {article.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-foreground-dim line-clamp-3">
                      {article.excerpt}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-10 border-y border-hairline py-8 text-sm text-foreground-muted">
            Aucun article publié pour le moment.
          </p>
        )}
      </section>
    </div>
  );
}
