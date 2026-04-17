import Link from 'next/link';
import { MatchCard } from '@/components/features/league/match-card';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';
import { getServerCaller } from '@/server/caller';

export const revalidate = 60;

interface HistoriquePageProps {
  searchParams: Promise<{
    season?: string | string[];
  }>;
}

export default async function HistoriquePage({ searchParams }: HistoriquePageProps) {
  const params = await searchParams;
  const selectedSeasonId = typeof params.season === 'string' ? params.season : undefined;
  const caller = await getServerCaller();

  const seasons = await caller.league.getAllSeasons();
  const currentSeason = seasons.find((s) => s.isCurrent);
  const activeSeasonId = selectedSeasonId ?? currentSeason?.id;
  const activeSeasonName = seasons.find((s) => s.id === activeSeasonId)?.name ?? 'Saison courante';

  const matches = activeSeasonId
    ? await caller.league.getSchedule({ seasonId: activeSeasonId })
    : [];

  const completedMatches = matches.filter((m) => m.isCompleted);
  const upcomingMatches = matches.filter((m) => !m.isCompleted);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-kicker">League</p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">Historique</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
          Resultats et calendrier de la saison. Selectionnez une saison pour consulter
          l&apos;historique complet.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {seasons.map((season) => (
          <Link
            key={season.id}
            href={`/league/historique?season=${season.id}`}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition',
              season.id === activeSeasonId
                ? 'bg-white text-[#12111a]'
                : 'border border-white/[0.05] bg-white/[0.035] text-white/78 hover:bg-white/8 hover:text-white',
            )}
          >
            {season.name}
            {season.isCurrent ? ' (courante)' : ''}
          </Link>
        ))}
      </div>

      {completedMatches.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">
            Resultats — {activeSeasonName}
          </h2>
          <div className="grid gap-4 xl:grid-cols-2">
            {completedMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      ) : null}

      {upcomingMatches.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">
            Matchs a venir — {activeSeasonName}
          </h2>
          <div className="grid gap-4 xl:grid-cols-2">
            {upcomingMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      ) : null}

      {completedMatches.length === 0 && upcomingMatches.length === 0 ? (
        <Card className="space-y-3">
          <p className="text-kicker">Aucun match</p>
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">
            Aucun match enregistre pour cette saison
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-text-secondary">
            Les matchs apparaitront ici une fois qu&apos;ils auront ete programmes par
            l&apos;admin.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
