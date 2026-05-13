import Link from 'next/link';
import { ArrowDown } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { PlayerLink } from '@/components/ui/player-link';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';

interface HeroTopPlayer {
  id: string;
  displayName: string;
  role: string;
  marketValue: number;
  teamName: string;
  teamShortCode: string;
  teamLogoUrl: string | null;
}

interface HeroProps {
  completedMatchCount: number;
  playerCount: number;
  seasonName: string | null;
  teamCount: number;
  topPlayers: HeroTopPlayer[];
  topTeam: { name: string; points: number; shortCode: string } | null;
  totalMarketValue: number;
}

function HeroKpi({ helper, label, value }: { helper: string; label: string; value: string }) {
  return (
    <div className="border-t border-hairline pt-5">
      <p className="label-mono">{label}</p>
      <p className="mt-3 display-md text-foreground tabular-nums">{value}</p>
      <p className="mt-2 text-sm leading-6 text-foreground-dim">{helper}</p>
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
}: HeroProps) {
  return (
    <section className="grid gap-12 border-b border-hairline pb-14 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16">
      <div>
        <p className="breadcrumb-mono">
          § 00 · L&apos;édition · {seasonName ?? 'Split en cours'}
          {topTeam ? ` / ${topTeam.shortCode} en tête` : ''}
        </p>

        <h1 className="mt-6 display-xl text-foreground">
          La ligue et le marché,<br />
          racontés à hauteur d&apos;équipe.
        </h1>

        <p className="mt-7 max-w-xl text-base leading-7 text-foreground-dim md:text-lg md:leading-8">
          En haut, les plus grosses valeurs du marché. Plus bas, le classement et les derniers
          résultats donnent le vrai rythme du split — sans détour.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/transfermarket" className={buttonVariants({ size: 'lg' })}>
            Explorer le marché
          </Link>
          <Link
            href="#home-overview"
            className={cn(buttonVariants({ variant: 'ghost', size: 'lg' }), 'gap-2')}
          >
            <ArrowDown className="h-4 w-4" />
            Classement et résultats
          </Link>
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          <HeroKpi
            label="Équipes"
            value={teamCount.toString().padStart(2, '0')}
            helper={
              topTeam ? `${topTeam.shortCode} mène le split.` : 'Classement en attente.'
            }
          />
          <HeroKpi
            label="Joueurs suivis"
            value={playerCount.toString().padStart(2, '0')}
            helper={`${completedMatchCount} séries déjà jouées.`}
          />
          <HeroKpi
            label="Valeur cumulée"
            value={formatCurrency(totalMarketValue)}
            helper="Évaluée par la direction sportive."
          />
        </div>
      </div>

      <aside className="border-l border-hairline pl-8 lg:pl-10">
        <p className="label-mono">Top 3 valeurs</p>
        <h2 className="mt-3 display-md text-foreground">Les gros noms du moment.</h2>
        <p className="mt-3 max-w-sm text-sm leading-6 text-foreground-dim">
          Les trois plus grosses valeurs marchandes, telles que cotées en ce début de fenêtre.
        </p>

        <ol className="mt-8 flex flex-col">
          {topPlayers.length > 0 ? (
            topPlayers.slice(0, 3).map((player, index) => (
              <li
                key={player.id}
                className="grid grid-cols-[auto_1fr_auto] items-baseline gap-5 border-t border-hairline py-5"
              >
                <span className="label-mono text-foreground-muted tabular-nums">
                  § {(index + 1).toString().padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <PlayerLink
                    playerId={player.id}
                    className="block truncate font-display text-2xl tracking-tight text-foreground"
                  >
                    {player.displayName}
                  </PlayerLink>
                  <p className="mt-1 truncate label-mono text-foreground-muted">
                    {player.teamShortCode} · {player.role}
                  </p>
                </div>
                <p className="font-display text-xl tracking-tight text-foreground tabular-nums">
                  {formatCurrency(player.marketValue)}
                </p>
              </li>
            ))
          ) : (
            <li className="border-t border-hairline py-5 text-sm text-foreground-muted">
              Les top valeurs apparaîtront ici dès que les joueurs seront disponibles.
            </li>
          )}
        </ol>
      </aside>
    </section>
  );
}
