import { FightMatchCard } from '@/components/features/league/fight-match-card';
import { getServerCaller } from '@/server/caller';

export const revalidate = 60;

export default async function MatchesPage() {
  const caller = await getServerCaller();
  const allMatches = await caller.match.getAll();

  return (
    <div className="space-y-8">
      <div>
        <p className="text-kicker">League matches</p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">Resultats</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
          Calendrier complet des matchs avec scores issus de la base de donnees.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {allMatches.length > 0 ? (
          allMatches.map((match, i) => (
            <FightMatchCard key={match.id} match={match} index={i} />
          ))
        ) : (
          <p className="text-sm text-text-secondary">Aucun match programme.</p>
        )}
      </div>
    </div>
  );
}
