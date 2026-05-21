import { FightMatchCard } from '@/components/features/league/fight-match-card';
import { StandingsStack } from '@/components/features/league/standings-stack';
import { getLeaguePageSnapshot } from '@/server/public/page-data';

export const revalidate = 60;

export default async function LeaguePage() {
  const snapshot = await getLeaguePageSnapshot();

  return (
    <div className="flex flex-col gap-20 md:gap-24">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ 03 · La compétition</p>
        <h1 className="mt-4 display-lg text-foreground">Classement du split.</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-foreground-dim">
          Vue publique du split courant avec standings, rythme de compétition et aperçu des
          derniers résultats.
        </p>
      </header>

      <section className="grid gap-16 xl:grid-cols-[1.2fr_0.8fr] xl:gap-20">
        <div>
          <p className="label-mono">§ Standings</p>
          <h2 className="mt-3 display-md text-foreground">
            {snapshot.standings.length.toString().padStart(2, '0')} équipe
            {snapshot.standings.length > 1 ? 's' : ''} engagée
            {snapshot.standings.length > 1 ? 's' : ''}.
          </h2>
          <div className="mt-8">
            {snapshot.standings.length > 0 ? (
              <StandingsStack standings={snapshot.standings} recentForm={snapshot.recentForm} />
            ) : (
              <div className="border border-hairline bg-surface px-5 py-6">
                <p className="text-sm text-foreground-dim">
                  Aucune donnée de classement pour le moment.
                </p>
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="label-mono">§ Derniers résultats</p>
          <h2 className="mt-3 display-md text-foreground">À chaud.</h2>
          <div className="mt-8 space-y-5">
            {snapshot.recentMatches.length > 0 ? (
              snapshot.recentMatches.map((match, index) => (
                <FightMatchCard key={match.id} match={match} index={index} />
              ))
            ) : (
              <div className="border border-hairline bg-surface px-5 py-6">
                <p className="text-sm text-foreground-dim">
                  Aucun match terminé pour le moment.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
