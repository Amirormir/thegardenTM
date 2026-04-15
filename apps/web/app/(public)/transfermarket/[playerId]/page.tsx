import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { MarketValueChart } from '@/components/features/charts/market-value-chart';
import { PerformanceTrendsChart } from '@/components/features/charts/performance-trends-chart';
import { RiotFetchButton } from '@/components/features/transfermarket/riot-fetch-button';
import { TeamLeagueSnapshotCard } from '@/components/features/transfermarket/team-league-snapshot-card';
import { FreeAgentSignButton } from '@/components/features/transfermarket/free-agent-sign-button';
import { TransferOfferButton } from '@/components/features/transfermarket/transfer-offer-button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PlayerValue } from '@/components/ui/player-value';
import { TeamAvatar } from '@/components/ui/team-avatar';
import { TeamTintCard, TeamTintMediaFrame } from '@/components/ui/team-tint';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { auth } from '@/lib/auth';
import { buildPlayerRiotId, getPlayerInitials } from '@/lib/utils/player-display';
import { formatCompactDate, formatCurrency, formatDateTime } from '@/lib/utils/format';
import { getServerCaller } from '@/server/caller';

export const revalidate = 60;

interface PlayerDetailPageProps {
  params: Promise<{
    playerId: string;
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

function getContractStatusLabel(status: string) {
  if (status === 'ACTIVE') return 'Actif';
  if (status === 'EXPIRED') return 'Expire';
  if (status === 'TERMINATED') return 'Rompu';
  if (status === 'LOAN') return 'Pret';
  return status;
}

export default async function PlayerDetailPage({ params }: PlayerDetailPageProps) {
  const { playerId } = await params;
  const session = await auth();
  const isAdmin = session?.user?.role === 'ADMIN';
  const isCaptain = session?.user?.role === 'TEAM_CAPTAIN' || isAdmin;
  const userTeamId = session?.user?.teamId ?? null;
  const caller = await getServerCaller();

  const [player, contractHistory, standings] = await Promise.all([
    caller.player.getById({ id: playerId }).catch((error: unknown) => {
      if (isNotFoundError(error)) {
        notFound();
      }

      throw error;
    }),
    caller.contract.getByPlayer({ playerId }),
    caller.league.getStandings(),
  ]);

  if (!player) {
    notFound();
  }

  const activeContract = player.contracts[0] ?? null;
  const marketDelta =
    player.marketValueHistory[0]?.newValue !== undefined
      ? player.marketValueHistory[0].newValue - player.marketValueHistory[0].previousValue
      : 0;
  const teamName = player.team?.name ?? 'Free Agent';
  const teamShortCode = player.team?.shortCode ?? 'FA';
  const teamStanding = player.teamId ? standings.find((team) => team.id === player.teamId) : null;
  const teamStandingPlace = teamStanding
    ? standings.findIndex((team) => team.id === teamStanding.id) + 1
    : null;
  const recentStats = player.playerMatchStats;
  const recentTotals = recentStats.reduce(
    (accumulator, stat) => ({
      kills: accumulator.kills + stat.kills,
      deaths: accumulator.deaths + stat.deaths,
      assists: accumulator.assists + stat.assists,
      cs: accumulator.cs + stat.cs,
      damage: accumulator.damage + stat.damage,
      wins: accumulator.wins + (stat.result === 'WIN' ? 1 : 0),
    }),
    {
      kills: 0,
      deaths: 0,
      assists: 0,
      cs: 0,
      damage: 0,
      wins: 0,
    },
  );
  const recentGamesCount = recentStats.length;
  const recentWinRate =
    recentGamesCount > 0 ? Math.round((recentTotals.wins / recentGamesCount) * 100) : 0;
  const recentKda =
    recentGamesCount > 0
      ? ((recentTotals.kills + recentTotals.assists) / Math.max(recentTotals.deaths, 1)).toFixed(2)
      : '0.00';
  const averageCs = recentGamesCount > 0 ? Math.round(recentTotals.cs / recentGamesCount) : 0;
  const averageDamage =
    recentGamesCount > 0 ? Math.round(recentTotals.damage / recentGamesCount) : 0;

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <TeamTintCard
          elevated
          className="min-h-full"
          contentClassName="space-y-6"
          logoUrl={player.team?.logoUrl}
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <TeamTintMediaFrame
              logoUrl={player.team?.logoUrl}
              className="h-36 w-36 shrink-0 rounded-[28px]"
            >
              {player.imageUrl ? (
                <img
                  src={player.imageUrl}
                  alt={player.displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-white/8 font-display text-4xl font-bold text-white">
                  {getPlayerInitials(player.displayName)}
                </div>
              )}
            </TeamTintMediaFrame>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={player.role}>{player.role}</Badge>
                {player.secondaryRoles.map((secondaryRole) => (
                  <Badge key={secondaryRole} variant={secondaryRole}>
                    {secondaryRole}
                  </Badge>
                ))}
                <Badge variant="actif">{player.isActive ? 'actif' : 'inactif'}</Badge>
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-2 text-kicker">
                  <TeamAvatar
                    name={teamName}
                    shortCode={teamShortCode}
                    logoUrl={player.team?.logoUrl ?? null}
                    size="sm"
                    className="h-5 w-5 rounded-md text-[0.55rem]"
                  />
                  <span>
                    {teamName} / {teamShortCode}
                  </span>
                </div>
                <h1 className="mt-2 font-display text-5xl font-bold text-white">
                  {player.displayName}
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-text-secondary">
                  Profil public alimente par Prisma via tRPC avec historique contractuel,
                  trajectoire de valorisation et performances stockees game par game.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/transfermarket/comparison?playerA=${player.id}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-accent-glow transition hover:text-white"
                  >
                    Comparer ce joueur
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  {isAdmin ? <RiotFetchButton playerId={playerId} /> : null}
                </div>
                {isCaptain && userTeamId && player.teamId && player.teamId !== userTeamId && activeContract ? (
                  <div className="mt-4">
                    <TransferOfferButton
                      playerId={player.id}
                      playerName={player.displayName}
                      releaseClause={activeContract.releaseClause}
                      buyerTeamId={userTeamId}
                    />
                  </div>
                ) : null}
                {isCaptain && userTeamId && !player.teamId ? (
                  <div className="mt-4">
                    <FreeAgentSignButton
                      playerId={player.id}
                      playerName={player.displayName}
                      teamId={userTeamId}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-white/8 bg-white/4">
              <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">Riot ID</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {buildPlayerRiotId(player)}
              </p>
            </Card>
            <Card className="border-white/8 bg-white/4">
              <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">Salary</p>
              <p className="mt-2 font-mono text-lg font-semibold text-white">
                {formatCurrency(player.salary)}
              </p>
            </Card>
            <Card className="border-white/8 bg-white/4">
              <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">Contract</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {activeContract ? `${activeContract.durationBo3} BO3` : 'N/A'}
              </p>
            </Card>
            <Card className="border-white/8 bg-white/4">
              <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">Profile</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {[player.nationality, player.age ? `${player.age} ans` : null]
                  .filter(Boolean)
                  .join(' / ') || 'Non renseigne'}
              </p>
            </Card>
          </div>
        </TeamTintCard>

        <div className="space-y-4">
          <PlayerValue value={player.marketValue} delta={marketDelta} />
          <Card className="space-y-3">
            <p className="text-kicker">Contract snapshot</p>
            <div className="space-y-2 text-sm text-text-secondary">
              <p>
                Status{' '}
                <span className="font-semibold text-white">
                  {activeContract?.status ?? 'Aucun contrat actif'}
                </span>
              </p>
              <p>
                Release clause{' '}
                <span className="font-mono font-semibold text-white">
                  {activeContract?.releaseClause
                    ? formatCurrency(activeContract.releaseClause)
                    : 'N/A'}
                </span>
              </p>
              <p>
                Transfer fee{' '}
                <span className="font-mono font-semibold text-white">
                  {activeContract?.transferFee ? formatCurrency(activeContract.transferFee) : 'N/A'}
                </span>
              </p>
            </div>
          </Card>
          {player.team && teamStanding && teamStandingPlace ? (
            <TeamLeagueSnapshotCard
              team={player.team}
              place={teamStandingPlace}
              points={teamStanding.points}
              wins={teamStanding.wins}
              losses={teamStanding.losses}
              mapWins={teamStanding.mapWins}
              mapLosses={teamStanding.mapLosses}
            />
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="space-y-2 border-white/8 bg-white/4">
          <p className="text-kicker">Recent KDA</p>
          <p className="font-display text-3xl font-bold text-white">{recentKda}</p>
          <p className="text-sm text-text-secondary">{recentGamesCount} games prises en compte.</p>
        </Card>
        <Card className="space-y-2 border-white/8 bg-white/4">
          <p className="text-kicker">Win rate</p>
          <p className="font-display text-3xl font-bold text-white">{recentWinRate}%</p>
          <p className="text-sm text-text-secondary">{recentTotals.wins} wins recentes.</p>
        </Card>
        <Card className="space-y-2 border-white/8 bg-white/4">
          <p className="text-kicker">Average CS</p>
          <p className="font-display text-3xl font-bold text-white">{averageCs}</p>
          <p className="text-sm text-text-secondary">Moyenne sur les games stockees.</p>
        </Card>
        <Card className="space-y-2 border-white/8 bg-white/4">
          <p className="text-kicker">Average damage</p>
          <p className="font-display text-3xl font-bold text-white">
            {formatCurrency(averageDamage)}
          </p>
          <p className="text-sm text-text-secondary">Degats moyens par game recente.</p>
        </Card>
      </section>

      {player.playerTrophies.length > 0 ? (
        <Card className="space-y-5">
          <div>
            <p className="text-kicker">Palmares</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-white">
              Distinctions du joueur
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {player.playerTrophies.map((trophy) => (
              <Card key={trophy.id} className="border-white/8 bg-white/4">
                <p className="text-kicker">{trophy.season.name}</p>
                <h3 className="mt-2 font-display text-2xl font-bold text-white">{trophy.name}</h3>
                <p className="mt-3 text-sm leading-7 text-text-secondary">
                  {trophy.description ?? 'Distinction officielle enregistree dans Garden.'}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-text-secondary">
                  <span>
                    {trophy.team ? `${trophy.team.name} (${trophy.team.shortCode})` : 'Individuel'}
                  </span>
                  <span>{formatCompactDate(trophy.awardedAt)}</span>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="space-y-5">
          <div>
            <p className="text-kicker">Market trajectory</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-white">
              Evolution de la valeur
            </h2>
          </div>
          <MarketValueChart history={player.marketValueHistory} />
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="text-kicker">Recent performance</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-white">
              Tendances de performance
            </h2>
          </div>
          <PerformanceTrendsChart stats={recentStats} />
        </Card>
      </section>

      <Card className="space-y-5">
        <div>
          <p className="text-kicker">Contract history</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-white">
            Historique contractuel
          </h2>
        </div>
        {contractHistory.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipe</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Salaire</TableHead>
                <TableHead>Duree</TableHead>
                <TableHead>Clause</TableHead>
                <TableHead>Frais</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contractHistory.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell className="font-semibold text-white">
                    {contract.team.name} ({contract.team.shortCode})
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        contract.status === 'ACTIVE' || contract.status === 'LOAN'
                          ? 'actif'
                          : 'expiré'
                      }
                    >
                      {getContractStatusLabel(contract.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">{formatCurrency(contract.salary)}</TableCell>
                  <TableCell>{contract.durationBo3} BO3</TableCell>
                  <TableCell className="font-mono">{formatCurrency(contract.releaseClause)}</TableCell>
                  <TableCell className="font-mono">
                    {contract.transferFee ? formatCurrency(contract.transferFee) : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm leading-7 text-text-secondary">
            Aucun historique contractuel n&apos;est disponible pour ce joueur.
          </p>
        )}
      </Card>

      <Card className="space-y-5">
        <div>
          <p className="text-kicker">Recent stored matches</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-white">Dernieres stats</h2>
        </div>
        {player.playerMatchStats.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Match</TableHead>
                <TableHead>Champion</TableHead>
                <TableHead>K / D / A</TableHead>
                <TableHead>CS</TableHead>
                <TableHead>Gold</TableHead>
                <TableHead>Damage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {player.playerMatchStats.map((stat) => (
                <TableRow key={stat.id}>
                  <TableCell>
                    <div className="font-semibold text-white">
                      {stat.matchGame.match.homeTeam.shortCode} vs{' '}
                      {stat.matchGame.match.awayTeam.shortCode}
                    </div>
                    <div className="text-xs text-text-secondary">
                      Game {stat.matchGame.gameNumber} /{' '}
                      {formatCompactDate(stat.matchGame.playedAt ?? stat.matchGame.match.scheduledAt)}
                    </div>
                  </TableCell>
                  <TableCell>{stat.champion}</TableCell>
                  <TableCell>
                    {stat.kills} / {stat.deaths} / {stat.assists}
                  </TableCell>
                  <TableCell>{stat.cs.toLocaleString('fr-FR')}</TableCell>
                  <TableCell>{stat.gold.toLocaleString('fr-FR')}</TableCell>
                  <TableCell>{stat.damage.toLocaleString('fr-FR')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm leading-7 text-text-secondary">
            Aucune statistique locale n&apos;est encore stockee pour ce joueur.
          </p>
        )}
      </Card>

      <Card className="space-y-5">
        <div>
          <p className="text-kicker">Audit trail</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-white">
            Historique de valorisation
          </h2>
        </div>
        {player.marketValueHistory.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Valeur</TableHead>
                <TableHead>Delta</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead>Par</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {player.marketValueHistory.map((entry) => {
                const delta = entry.newValue - entry.previousValue;

                return (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDateTime(entry.changedAt)}</TableCell>
                    <TableCell className="font-mono text-white">
                      {formatCurrency(entry.newValue)}
                    </TableCell>
                    <TableCell className={delta >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                      {delta >= 0 ? '+' : ''}
                      {formatCurrency(delta)}
                    </TableCell>
                    <TableCell>{entry.reason ?? 'Ajustement manuel'}</TableCell>
                    <TableCell>{entry.changedBy?.name ?? 'System'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm leading-7 text-text-secondary">
            Aucun historique de valorisation n&apos;est encore disponible pour ce joueur.
          </p>
        )}
      </Card>
    </div>
  );
}
