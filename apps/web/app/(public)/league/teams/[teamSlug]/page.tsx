import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';
import { TeamDraftPreferencesPanel } from '@/components/features/stats/team-draft-preferences-panel';
import { Badge } from '@/components/ui/badge';
import { PlayerLink } from '@/components/ui/player-link';
import { getOptimizedRemoteImageUrl } from '@/lib/utils/optimized-image';
import { buildPlayerRiotId, getPlayerInitials } from '@/lib/utils/player-display';
import { formatCompactDate, formatCurrency, formatDateTime } from '@/lib/utils/format';
import { getTeamPageSnapshot } from '@/server/public/page-data';

export const revalidate = 60;

interface TeamDetailPageProps {
  params: Promise<{
    teamSlug: string;
  }>;
}

const roleOrder = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'] as const;

function KpiBlock({
  helper,
  label,
  value,
}: {
  helper?: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="border-t border-hairline pt-5">
      <p className="label-mono">{label}</p>
      <div className="mt-3 display-md text-foreground tabular-nums">{value}</div>
      {helper ? <div className="mt-2 text-sm leading-6 text-foreground-dim">{helper}</div> : null}
    </div>
  );
}

function SidebarFact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-hairline py-3 first:border-t-0 first:pt-0">
      <span className="label-mono">{label}</span>
      <span className="text-right font-display text-lg tracking-tight tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const { teamSlug } = await params;
  const snapshot = await getTeamPageSnapshot(teamSlug);

  if (!snapshot) {
    notFound();
  }

  const { team, standings, schedule, seasons, currentSeason } = snapshot;

  const sortedPlayers = [...team.players].sort((left, right) => {
    const leftIndex = roleOrder.indexOf(left.role as (typeof roleOrder)[number]);
    const rightIndex = roleOrder.indexOf(right.role as (typeof roleOrder)[number]);

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    return left.displayName.localeCompare(right.displayName);
  });

  const standing = standings.find((entry) => entry.id === team.id) ?? null;
  const standingPlace = standing ? standings.findIndex((entry) => entry.id === team.id) + 1 : null;
  const totalMarketValue = sortedPlayers.reduce((sum, player) => sum + player.marketValue, 0);
  const totalSalary = sortedPlayers.reduce((sum, player) => sum + player.salary, 0);
  const salaryRemaining = team.salaryBudgetCap - totalSalary;
  const salaryUsedPercent =
    team.salaryBudgetCap > 0
      ? Math.min(100, Math.round((totalSalary / team.salaryBudgetCap) * 100))
      : 0;
  const completedMatches = schedule.filter((match) => match.isCompleted).slice(-3).reverse();
  const upcomingMatches = schedule.filter((match) => !match.isCompleted).slice(0, 3);

  return (
    <div className="flex flex-col gap-20 md:gap-24">
      <header className="border-b border-hairline pb-10">
        <p className="breadcrumb-mono">§ · Équipes · {team.shortCode}</p>

        <div className="mt-8 grid gap-10 lg:grid-cols-[auto_1fr] lg:items-end lg:gap-12">
          <div className="placeholder-diag h-40 w-40 shrink-0 overflow-hidden lg:h-48 lg:w-48">
            {team.logoUrl ? (
              <div className="relative h-full w-full">
                <Image
                  src={getOptimizedRemoteImageUrl(team.logoUrl, { width: 512 }) ?? team.logoUrl}
                  alt={team.name}
                  fill
                  priority
                  sizes="(min-width: 1024px) 12rem, 10rem"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center font-display text-5xl tracking-tight text-foreground-dim">
                {team.shortCode.slice(0, 3).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="actif">{team.shortCode}</Badge>
              <Badge variant="A">
                {sortedPlayers.length} joueur{sortedPlayers.length > 1 ? 's' : ''}
              </Badge>
              {standingPlace ? <Badge variant="S">#{standingPlace} ligue</Badge> : null}
            </div>

            <h1 className="mt-4 display-xl text-foreground">{team.name}</h1>

            <p className="mt-5 label-mono">
              {team.shortCode} · {sortedPlayers.length} joueurs ·{' '}
              {standing ? `${standing.points} pts ligue` : 'Hors compétition'}
            </p>

            <p className="mt-6 max-w-2xl text-base leading-7 text-foreground-dim">
              Vue publique de l&apos;équipe avec roster complet, valorisation, budget et
              accès direct vers chaque fiche transfermarket.
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-10 lg:grid-cols-[1fr_320px] lg:gap-16">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4 md:gap-12">
          <KpiBlock
            label="Record"
            value={standing ? `${standing.wins}–${standing.losses}` : '0–0'}
            helper={
              standing
                ? `${standing.points} pt${standing.points > 1 ? 's' : ''} en ligue.`
                : 'Aucune rencontre disputée.'
            }
          />
          <KpiBlock
            label="Diff. maps"
            value={standing ? `${standing.mapWins}–${standing.mapLosses}` : '0–0'}
            helper="Bilan des cartes jouées."
          />
          <KpiBlock
            label="Valeur effectif"
            value={formatCurrency(totalMarketValue)}
            helper={`Cumul ${sortedPlayers.length} joueur${sortedPlayers.length > 1 ? 's' : ''}.`}
          />
          <KpiBlock
            label="Marge salariale"
            value={formatCurrency(salaryRemaining)}
            helper={`${salaryUsedPercent}% de la masse engagée.`}
          />
        </div>

        <aside className="space-y-6 lg:border-l lg:border-hairline lg:pl-10">
          <div className="border border-hairline bg-surface p-5">
            <p className="label-mono">Masse salariale max</p>
            <p className="mt-3 display-md text-foreground tabular-nums">
              {formatCurrency(team.salaryBudgetCap)}
            </p>
            <div
              className="mt-5 percentile-bar"
              style={{ '--percentile': `${salaryUsedPercent}%` } as CSSProperties}
            />
            <div className="mt-4 space-y-0">
              <SidebarFact label="Masse salariale" value={formatCurrency(totalSalary)} />
              <SidebarFact label="Marge libre" value={formatCurrency(salaryRemaining)} />
              <SidebarFact label="Engagé" value={`${salaryUsedPercent}%`} />
              <SidebarFact label="Budget transfert" value={formatCurrency(team.transferBudget)} />
            </div>
          </div>

          <div className="border border-hairline bg-surface p-5">
            <p className="label-mono">{team.captains.length > 1 ? 'Capitaines' : 'Capitaine'}</p>
            <div className="mt-4 space-y-3">
              {team.captains.length > 0 ? (
                team.captains.map((captain) => (
                  <div key={captain.email}>
                    <p className="font-display text-lg tracking-tight text-foreground">
                      {captain.name ?? 'Sans nom'}
                    </p>
                    <p className="mt-1 label-mono lowercase tracking-normal">{captain.email}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-foreground-dim">Aucun capitaine assigné.</p>
              )}
            </div>
          </div>
        </aside>
      </section>

      <section>
        <p className="label-mono">§ 01 · Roster</p>
        <h2 className="mt-3 display-md text-foreground">
          {sortedPlayers.length.toString().padStart(2, '0')} joueur
          {sortedPlayers.length > 1 ? 's' : ''} sous contrat.
        </h2>
        <div className="mt-8 grid gap-px border-t border-hairline bg-hairline md:grid-cols-2 xl:grid-cols-3">
          {sortedPlayers.map((player) => (
            <article
              key={player.id}
              className="flex h-full flex-col bg-background px-5 py-5 transition-colors duration-150 hover:bg-surface-hover md:px-6"
            >
              <div className="flex items-center gap-2">
                <Badge variant={player.role}>{player.role}</Badge>
                {player.secondaryRoles.map((secondaryRole) => (
                  <Badge key={secondaryRole} variant={secondaryRole}>
                    {secondaryRole}
                  </Badge>
                ))}
              </div>

              <div className="mt-5 flex items-start gap-4">
                <div className="placeholder-diag h-16 w-16 shrink-0 overflow-hidden">
                  {player.imageUrl ? (
                    <img
                      src={player.imageUrl}
                      alt={player.displayName}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-display text-base text-foreground-dim">
                      {getPlayerInitials(player.displayName)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <PlayerLink
                    playerId={player.id}
                    className="block truncate font-display text-2xl tracking-tight text-foreground"
                  >
                    {player.displayName}
                  </PlayerLink>
                  <p className="mt-1 truncate label-mono" title={buildPlayerRiotId(player)}>
                    {buildPlayerRiotId(player)}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-hairline pt-4">
                <div>
                  <p className="label-mono">Valeur marchande</p>
                  <p className="mt-1 font-display text-2xl tabular-nums tracking-tight text-foreground">
                    {formatCurrency(player.marketValue)}
                  </p>
                </div>
                <div>
                  <p className="label-mono">Salaire</p>
                  <p className="mt-1 font-display text-2xl tabular-nums tracking-tight text-foreground">
                    {formatCurrency(player.salary)}
                  </p>
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-foreground-dim">
                {[player.nationality, player.age ? `${player.age} ans` : null]
                  .filter(Boolean)
                  .join(' / ') || 'Profil public transfermarket'}
              </p>

              <div className="mt-auto border-t border-hairline pt-5">
                <Link
                  href={`/transfermarket/${player.id}`}
                  className="label-mono text-foreground-dim transition-colors duration-150 hover:text-accent"
                >
                  Voir la fiche transfermarket â†’
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-12 xl:grid-cols-2 xl:gap-16">
        <div>
        <p className="label-mono">§ 02 · À venir</p>
          <h2 className="mt-3 display-md text-foreground">Prochains matchs.</h2>
          <div className="mt-8 border-t border-hairline">
            {upcomingMatches.length > 0 ? (
              upcomingMatches.map((match) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between gap-4 border-b border-hairline px-1 py-5"
                >
                  <div className="min-w-0">
                    <p className="font-display text-2xl tracking-tight text-foreground">
                      {match.homeTeam.shortCode}{' '}
                      <span className="text-foreground-muted">·</span> {match.awayTeam.shortCode}
                    </p>
                    <p className="mt-1 label-mono tabular-nums">
                      {formatDateTime(match.scheduledAt)}
                    </p>
                  </div>
                  <span className="label-mono">{match.format}</span>
                </div>
              ))
            ) : (
              <p className="pt-5 text-sm text-foreground-dim">
                Aucun match à venir pour le moment.
              </p>
            )}
          </div>
        </div>

        <div>
        <p className="label-mono">§ 03 · Derniers résultats</p>
        <h2 className="mt-3 display-md text-foreground">À chaud.</h2>
          <div className="mt-8 border-t border-hairline">
            {completedMatches.length > 0 ? (
              completedMatches.map((match) => {
                const isHome = match.homeTeam.id === team.id;
                const teamScore = isHome ? match.homeScore : match.awayScore;
                const oppScore = isHome ? match.awayScore : match.homeScore;
                const win = teamScore > oppScore;

                return (
                  <div
                    key={match.id}
                    className="flex items-center justify-between gap-4 border-b border-hairline px-1 py-5"
                  >
                    <div className="min-w-0">
                      <p className="font-display text-2xl tracking-tight text-foreground">
                        {match.homeTeam.shortCode}{' '}
                        <span className="text-foreground-muted">·</span> {match.awayTeam.shortCode}
                      </p>
                      <p className="mt-1 label-mono tabular-nums">
                        {formatCompactDate(match.playedAt ?? match.scheduledAt)}
                      </p>
                    </div>
                    <p
                      className={
                        'font-display text-3xl tracking-tight tabular-nums ' +
                        (win ? 'text-accent' : 'text-foreground-muted')
                      }
                    >
                      {match.homeScore}–{match.awayScore}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="pt-5 text-sm text-foreground-dim">
                Aucun résultat enregistré pour cette équipe.
              </p>
            )}
          </div>
        </div>
      </section>

      <TeamDraftPreferencesPanel
        teamId={team.id}
        seasons={seasons.map((season) => ({
          id: season.id,
          name: season.name,
          year: season.year,
          isCurrent: season.isCurrent,
        }))}
        defaultSeasonId={currentSeason?.id ?? seasons[0]?.id ?? null}
      />
    </div>
  );
}
