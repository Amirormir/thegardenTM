import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PlayerValue } from '@/components/ui/player-value';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

export default async function PlayerDetailPage({ params }: PlayerDetailPageProps) {
  const { playerId } = await params;
  const caller = await getServerCaller();

  const player = await caller.player.getById({ id: playerId }).catch((error: unknown) => {
    if (isNotFoundError(error)) {
      notFound();
    }

    throw error;
  });

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

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card elevated className="space-y-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            {player.imageUrl ? (
              <img
                src={player.imageUrl}
                alt={player.gameName}
                className="h-28 w-28 rounded-[28px] object-cover ring-1 ring-white/10"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-[28px] bg-white/8 font-display text-3xl font-bold text-white ring-1 ring-white/10">
                {player.gameName.slice(0, 2).toUpperCase()}
              </div>
            )}

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
                <p className="text-kicker">
                  {teamName} / {teamShortCode}
                </p>
                <h1 className="mt-2 font-display text-5xl font-bold text-white">
                  {player.gameName}
                  <span className="ml-2 text-2xl font-medium text-text-secondary">
                    #{player.tagLine}
                  </span>
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-text-secondary">
                  Profil public alimente par Prisma via tRPC. On y retrouve la valorisation
                  actuelle, les informations contractuelles, les performances stockees localement
                  et le palmares officiel du joueur.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-white/8 bg-white/4">
              <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">Name</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {player.firstName} {player.lastName}
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
                {activeContract ? formatCompactDate(activeContract.endDate) : 'N/A'}
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
        </Card>

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
        </div>
      </section>

      <Card className="space-y-5">
        <div>
          <p className="text-kicker">Palmares</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-white">Distinctions du joueur</h2>
        </div>
        {player.playerTrophies.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {player.playerTrophies.map((trophy) => (
              <Card key={trophy.id} className="border-white/8 bg-white/4">
                <p className="text-kicker">{trophy.season.name}</p>
                <h3 className="mt-2 font-display text-2xl font-bold text-white">{trophy.name}</h3>
                <p className="mt-3 text-sm leading-7 text-text-secondary">
                  {trophy.description ?? 'Distinction officielle enregistree dans Nexus League.'}
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
        ) : (
          <p className="text-sm leading-7 text-text-secondary">
            Aucun palmares n&apos;est encore enregistre pour ce joueur.
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
                      {stat.matchGame.match.homeTeam.shortCode} vs {stat.matchGame.match.awayTeam.shortCode}
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
                  <TableCell>{formatCurrency(stat.cs)}</TableCell>
                  <TableCell>{formatCurrency(stat.gold)}</TableCell>
                  <TableCell>{formatCurrency(stat.damage)}</TableCell>
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
