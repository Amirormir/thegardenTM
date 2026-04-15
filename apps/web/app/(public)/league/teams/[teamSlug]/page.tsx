import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PlayerLink } from '@/components/ui/player-link';
import { TeamAvatar } from '@/components/ui/team-avatar';
import { TeamTintCard, TeamTintMediaFrame } from '@/components/ui/team-tint';
import { buildPlayerRiotId, getPlayerInitials } from '@/lib/utils/player-display';
import { formatCompactDate, formatCurrency, formatDateTime } from '@/lib/utils/format';
import { getServerCaller } from '@/server/caller';

export const revalidate = 60;

interface TeamDetailPageProps {
  params: Promise<{
    teamSlug: string;
  }>;
}

function isNotFoundError(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    error.code === 'NOT_FOUND'
  );
}

const roleOrder = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'] as const;

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const { teamSlug } = await params;
  const caller = await getServerCaller();

  const [team, standings, schedule] = await Promise.all([
    caller.team.getBySlug({ slug: teamSlug }).catch((error: unknown) => {
      if (isNotFoundError(error)) {
        notFound();
      }

      throw error;
    }),
    caller.league.getStandings(),
    caller.league.getSchedule(),
  ]);

  if (!team) {
    notFound();
  }

  const sortedPlayers = [...team.players].sort((left, right) => {
    const leftIndex = roleOrder.indexOf(left.role as (typeof roleOrder)[number]);
    const rightIndex = roleOrder.indexOf(right.role as (typeof roleOrder)[number]);

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    return left.displayName.localeCompare(right.displayName);
  });

  const standing = standings.find((entry) => entry.id === team.id) ?? null;
  const totalMarketValue = sortedPlayers.reduce((sum, player) => sum + player.marketValue, 0);
  const totalSalary = sortedPlayers.reduce((sum, player) => sum + player.salary, 0);
  const budgetRemaining = team.budget - totalSalary;
  const teamMatches = schedule.filter(
    (match) => match.homeTeam.id === team.id || match.awayTeam.id === team.id,
  );
  const completedMatches = teamMatches.filter((match) => match.isCompleted).slice(-3).reverse();
  const upcomingMatches = teamMatches.filter((match) => !match.isCompleted).slice(0, 3);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <TeamTintCard
          elevated
          className="min-h-full"
          contentClassName="space-y-6"
          logoUrl={team.logoUrl}
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <TeamAvatar
              name={team.name}
              shortCode={team.shortCode}
              logoUrl={team.logoUrl}
              size="lg"
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="actif">{team.shortCode}</Badge>
                <Badge variant="A">{sortedPlayers.length} joueurs</Badge>
                {standing ? (
                  <Badge variant="S">
                    #{standings.findIndex((entry) => entry.id === team.id) + 1} au classement
                  </Badge>
                ) : null}
              </div>

              <p className="mt-4 text-kicker">League team profile</p>
              <h1 className="mt-2 font-display text-5xl font-bold text-white">{team.name}</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-text-secondary">
                Vue publique de l equipe avec roster complet, valorisation, budget et acces direct
                vers chaque fiche transfermarket.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-white/8 bg-white/4">
              <p className="text-kicker">Record</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {standing ? `${standing.wins}-${standing.losses}` : '0-0'}
              </p>
            </Card>
            <Card className="border-white/8 bg-white/4">
              <p className="text-kicker">Map diff</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {standing ? `${standing.mapWins}-${standing.mapLosses}` : '0-0'}
              </p>
            </Card>
            <Card className="border-white/8 bg-white/4">
              <p className="text-kicker">Market value</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {formatCurrency(totalMarketValue)}
              </p>
            </Card>
            <Card className="border-white/8 bg-white/4">
              <p className="text-kicker">Budget restant</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {formatCurrency(budgetRemaining)}
              </p>
            </Card>
          </div>
        </TeamTintCard>

        <div className="space-y-4">
          <Card className="space-y-3">
            <p className="text-kicker">Staff</p>
            <h2 className="font-display text-2xl font-bold text-white">
              {team.captains.length > 1 ? 'Capitaines' : 'Capitaine'}
            </h2>
            {team.captains.length > 0 ? (
              team.captains.map((c) => (
                <div key={c.email} className="text-sm text-text-secondary">
                  <span className="font-semibold text-white">{c.name ?? 'Sans nom'}</span>
                  {' — '}
                  {c.email}
                </div>
              ))
            ) : (
              <p className="text-sm text-text-secondary">Aucun capitaine assigne</p>
            )}
          </Card>

          <Card className="space-y-3">
            <p className="text-kicker">Finance</p>
            <h2 className="font-display text-2xl font-bold text-white">Budget club</h2>
            <p className="text-sm text-text-secondary">
              Budget total: <span className="font-semibold text-white">{formatCurrency(team.budget)}</span>
            </p>
            <p className="text-sm text-text-secondary">
              Masse salariale: <span className="font-semibold text-white">{formatCurrency(totalSalary)}</span>
            </p>
          </Card>
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <p className="text-kicker">Roster</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-white">Joueurs de l equipe</h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {sortedPlayers.map((player) => (
            <TeamTintCard
              key={player.id}
              className="h-full"
              contentClassName="space-y-4"
              logoUrl={team.logoUrl}
            >
              <div className="flex items-start gap-4">
                <TeamTintMediaFrame
                  logoUrl={team.logoUrl}
                  className="h-16 w-16 shrink-0 rounded-2xl"
                >
                  {player.imageUrl ? (
                    <img
                      src={player.imageUrl}
                      alt={player.displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-white/8 text-sm font-semibold text-white">
                      {getPlayerInitials(player.displayName)}
                    </div>
                  )}
                </TeamTintMediaFrame>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={player.role}>{player.role}</Badge>
                    {player.secondaryRoles.map((secondaryRole) => (
                      <Badge key={secondaryRole} variant={secondaryRole}>
                        {secondaryRole}
                      </Badge>
                    ))}
                  </div>
                  <h3 className="mt-3 font-display text-2xl font-bold text-white">
                    <PlayerLink
                      playerId={player.id}
                      className="font-display text-2xl font-bold text-white"
                    >
                      {player.displayName}
                    </PlayerLink>
                  </h3>
                  <p className="mt-1 text-sm text-text-secondary">{buildPlayerRiotId(player)}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">
                    Market value
                  </p>
                  <p className="mt-2 font-semibold text-white">{formatCurrency(player.marketValue)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">
                    Salary
                  </p>
                  <p className="mt-2 font-semibold text-white">{formatCurrency(player.salary)}</p>
                </div>
              </div>

              <p className="text-sm text-text-secondary">
                {[player.nationality, player.age ? `${player.age} ans` : null]
                  .filter(Boolean)
                  .join(' / ') || 'Profil public transfermarket'}
              </p>

              <Link
                href={`/transfermarket/${player.id}`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-accent-glow transition hover:text-white"
              >
                Voir la fiche transfermarket
                <ArrowRight className="h-4 w-4" />
              </Link>
            </TeamTintCard>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="space-y-4">
          <div>
            <p className="text-kicker">Upcoming</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-white">Prochains matchs</h2>
          </div>
          {upcomingMatches.length > 0 ? (
            <div className="space-y-3">
              {upcomingMatches.map((match) => (
                <div
                  key={match.id}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-white">
                      {match.homeTeam.shortCode} vs {match.awayTeam.shortCode}
                    </p>
                    <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">
                      {match.format}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-text-secondary">
                    {formatDateTime(match.scheduledAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">Aucun match a venir pour le moment.</p>
          )}
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="text-kicker">Recent</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-white">Derniers resultats</h2>
          </div>
          {completedMatches.length > 0 ? (
            <div className="space-y-3">
              {completedMatches.map((match) => (
                <div
                  key={match.id}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-white">
                      {match.homeTeam.shortCode} vs {match.awayTeam.shortCode}
                    </p>
                    <p className="font-display text-xl font-bold text-white">
                      {match.homeScore} - {match.awayScore}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-text-secondary">
                    {formatCompactDate(match.playedAt ?? match.scheduledAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">
              Aucun resultat enregistre pour cette equipe.
            </p>
          )}
        </Card>
      </section>
    </div>
  );
}
