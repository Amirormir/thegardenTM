import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { PlayerLink } from '@/components/ui/player-link';
import { TeamInline } from '@/components/ui/team-inline';
import { getOptimizedRemoteImageUrl } from '@/lib/utils/optimized-image';
import { getPlayerInitials } from '@/lib/utils/player-display';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';

interface HeroTopPlayer {
  id: string;
  displayName: string;
  imageUrl: string | null;
  role: string;
  marketValue: number;
  teamName: string;
  teamShortCode: string;
  teamLogoUrl: string | null;
}

export interface HeroFeaturedArticle {
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl: string | null;
  authorName: string | null;
  publishedAt: Date | string | null;
}

interface HeroProps {
  completedMatchCount: number;
  playerCount: number;
  seasonName: string | null;
  teamCount: number;
  topPlayers: HeroTopPlayer[];
  topTeam: { name: string; points: number; shortCode: string; logoUrl: string | null } | null;
  totalMarketValue: number;
  featuredArticle?: HeroFeaturedArticle | null;
}

function HeroKpi({
  helper,
  label,
  value,
}: {
  helper: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="border-t border-hairline pt-5">
      <p className="label-mono">{label}</p>
      <p className="mt-3 display-md text-foreground tabular-nums">{value}</p>
      <div className="mt-2 text-sm leading-6 text-foreground-dim">{helper}</div>
    </div>
  );
}

export function Hero({
  completedMatchCount,
  playerCount,
  seasonName,
  teamCount,
  topPlayers,
  topTeam,
  totalMarketValue,
  featuredArticle = null,
}: HeroProps) {
  return (
    <section className="grid gap-12 border-b border-hairline pb-14 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16">
      <div>
        <p className="breadcrumb-mono">
          00 / L&apos;edition / {seasonName ?? 'Split en cours'}
          {topTeam ? ` / ${topTeam.shortCode} en tete` : ''}
        </p>

        {featuredArticle ? (
          <Link
            href={`/news/${featuredArticle.slug}`}
            className="group mt-6 block"
            aria-label={`Lire l'article: ${featuredArticle.title}`}
          >
            {featuredArticle.coverImageUrl ? (
              <div className="relative aspect-[16/9] w-full overflow-hidden border border-hairline bg-surface">
                <Image
                  src={
                    getOptimizedRemoteImageUrl(featuredArticle.coverImageUrl, { width: 1600 }) ??
                    featuredArticle.coverImageUrl
                  }
                  alt={featuredArticle.title}
                  fill
                  priority
                  sizes="(min-width: 1024px) 60vw, 100vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
              </div>
            ) : null}
            <p className="mt-6 label-mono text-foreground-muted">A la une</p>
            <h1 className="mt-3 display-xl text-foreground transition-colors duration-150 group-hover:text-accent">
              {featuredArticle.title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-foreground-dim md:text-lg md:leading-8">
              {featuredArticle.excerpt}
            </p>
          </Link>
        ) : (
          <>
            <h1 className="mt-6 display-xl text-foreground">
              La ligue et le marche,
              <br />
              racontes a hauteur d&apos;equipe.
            </h1>

            <p className="mt-7 max-w-xl text-base leading-7 text-foreground-dim md:text-lg md:leading-8">
              En haut, les plus grosses valeurs du marche. Plus bas, le classement et les derniers
              resultats donnent le vrai rythme du split, sans detour.
            </p>
          </>
        )}

        <div className="mt-10 flex flex-wrap gap-3">
          {featuredArticle ? (
            <Link
              href={`/news/${featuredArticle.slug}`}
              className={buttonVariants({ size: 'lg' })}
            >
              Lire l&apos;article
            </Link>
          ) : (
            <Link href="/transfermarket" className={buttonVariants({ size: 'lg' })}>
              Explorer le marche
            </Link>
          )}
          <Link
            href="#home-overview"
            className={cn(buttonVariants({ variant: 'ghost', size: 'lg' }), 'gap-2')}
          >
            <ArrowDown className="h-4 w-4" />
            Classement et resultats
          </Link>
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          <HeroKpi
            label="Equipes"
            value={teamCount.toString().padStart(2, '0')}
            helper={
              topTeam ? (
                <TeamInline
                  name={topTeam.name}
                  shortCode={topTeam.shortCode}
                  logoUrl={topTeam.logoUrl}
                  size="xs"
                  text={`${topTeam.shortCode} mene le split.`}
                />
              ) : (
                'Classement en attente.'
              )
            }
          />
          <HeroKpi
            label="Joueurs suivis"
            value={playerCount.toString().padStart(2, '0')}
            helper={`${completedMatchCount} series deja jouees.`}
          />
          <HeroKpi
            label="Valeur cumulee"
            value={formatCurrency(totalMarketValue)}
            helper="Evaluee par la direction sportive."
          />
        </div>
      </div>

      <aside className="border-l border-hairline pl-8 lg:pl-10">
        <p className="label-mono">Top 10 valeurs</p>
        <h2 className="mt-3 display-md text-foreground">Les gros noms du moment.</h2>
        <p className="mt-3 max-w-sm text-sm leading-6 text-foreground-dim">
          Les dix plus grosses valeurs marchandes, telles que cotees au debut de la fenetre.
        </p>

        <ol className="mt-8 flex flex-col">
          {topPlayers.length > 0 ? (
            topPlayers.slice(0, 10).map((player, index) => (
              <li
                key={player.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-5 border-t border-hairline py-5"
              >
                <span className="label-mono text-foreground-muted tabular-nums">
                  #{(index + 1).toString().padStart(2, '0')}
                </span>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="placeholder-diag h-12 w-12 shrink-0 overflow-hidden border border-hairline bg-surface">
                    {player.imageUrl ? (
                      <Image
                        src={getOptimizedRemoteImageUrl(player.imageUrl, { width: 96 }) ?? player.imageUrl}
                        alt={player.displayName}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-display text-sm text-foreground-dim">
                        {getPlayerInitials(player.displayName)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <PlayerLink
                      playerId={player.id}
                      className="block truncate font-display text-2xl tracking-tight text-foreground"
                    >
                      {player.displayName}
                    </PlayerLink>
                    <div className="mt-1 flex flex-wrap items-center gap-2 label-mono text-foreground-muted">
                      <TeamInline
                        name={player.teamName}
                        shortCode={player.teamShortCode}
                        logoUrl={player.teamLogoUrl}
                        size="xs"
                        text={player.teamShortCode}
                        textClassName="text-foreground-muted"
                      />
                      <span>·</span>
                      <span>{player.role}</span>
                    </div>
                  </div>
                </div>
                <p className="font-display text-xl tracking-tight text-foreground tabular-nums">
                  {formatCurrency(player.marketValue)}
                </p>
              </li>
            ))
          ) : (
            <li className="border-t border-hairline py-5 text-sm text-foreground-muted">
              Les top valeurs apparaitront ici des que les joueurs seront disponibles.
            </li>
          )}
        </ol>
      </aside>
    </section>
  );
}
