import Link from 'next/link';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { SeasonTwoData } from '@/lib/custom/season-two';
import { formatCompactDate, formatDateTime } from '@/lib/utils/format';
import { CustomRankBadge } from './custom-rank-badge';
import { DeleteTestLeaderboardButton } from './delete-test-leaderboard-button';

type LeaderboardPlayer = SeasonTwoData['leaderboard'][number];

function formatPercent(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function phaseLabel(phase: string) {
  const labels: Record<string, string> = {
    waiting: 'En attente',
    role_selection: 'Choix des roles',
    cost_selection: 'Choix des niveaux',
    team_building: 'Creation des equipes',
    completed: 'Equipes generees',
  };

  return labels[phase] ?? phase;
}

function activeStatusLabel(status: string) {
  const labels: Record<string, string> = {
    awaiting_winner: 'En attente du winner',
    awaiting_performance: 'En attente du MVP / ACE',
    completed: 'Terminee',
  };

  return labels[status] ?? status;
}

function placementPreviewLabel(player: LeaderboardPlayer) {
  if (player.tier.projectedTier == null) return null;

  return `${player.tier.projectedTier}${
    player.tier.projectedSubDivision ? ` ${player.tier.projectedSubDivision}` : ''
  }`;
}

function placementPreview(player: LeaderboardPlayer) {
  if (player.tier.projectedTier == null) return null;

  return {
    tier: player.tier.projectedTier,
    subDivision: player.tier.projectedSubDivision,
    displayScore: player.tier.projectedDisplayScore,
  };
}

function unrankedReasonLabel(player: LeaderboardPlayer) {
  if (player.unrankedReason === 'placements') {
    const remainingGames = `${player.tier.placementsRemaining} game${
      player.tier.placementsRemaining > 1 ? 's' : ''
    } restante${player.tier.placementsRemaining > 1 ? 's' : ''}`;
    return `Placements en cours · ${remainingGames}`;
  }

  if (player.unrankedReason === 'uncertainty') return 'Incertitude trop elevee';
  return null;
}

export function SeasonTwoDashboard({ data }: { data: SeasonTwoData }) {
  const topPlayer = data.leaderboard.find((player) => player.isRanked) ?? data.leaderboard[0] ?? null;

  return (
    <div className="flex flex-col gap-16 md:gap-20">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ 05 · Custom · Saison 2</p>
        <h1 className="mt-4 display-lg text-foreground">Tracker custom live.</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-foreground-dim">
          Leaderboard live du bot, queue active, custom en cours et derniers resultats. La couche
          replay `.rofl` pourra maintenant se brancher sur cette base.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <Card elevated>
          <p className="label-mono">Leaderboard</p>
          <p className="mt-3 display-md text-foreground">{data.leaderboard.length}</p>
          <p className="mt-3 text-sm text-foreground-dim">
            {data.rankedCount} classes · {data.leaderboard.length - data.rankedCount} NR
          </p>
        </Card>
        <Card elevated>
          <p className="label-mono">Top actuel</p>
          <div className="mt-4">
            {topPlayer ? (
              <CustomRankBadge
                tier={topPlayer.tier.tier}
                subDivision={topPlayer.tier.subDivision}
                displayScore={topPlayer.displayScore}
                placementPreview={placementPreview(topPlayer)}
                showScore
                size="md"
              />
            ) : (
              <p className="text-sm text-foreground-dim">Aucun top pour le moment</p>
            )}
          </div>
          <p className="mt-3 text-sm text-foreground-dim">{topPlayer?.username ?? 'Waiting'}</p>
        </Card>
        <Card elevated>
          <p className="label-mono">Queue</p>
          <p className="mt-3 display-md text-foreground">
            {data.queue ? `${data.queue.readyPlayers}/${data.queue.maxPlayers}` : '0/10'}
          </p>
          <p className="mt-3 text-sm text-foreground-dim">
            {data.queue ? phaseLabel(data.queue.currentPhase) : 'Pas de queue active'}
          </p>
        </Card>
        <Card elevated>
          <p className="label-mono">Custom active</p>
          <p className="mt-3 display-md text-foreground">
            {data.activeGame ? activeStatusLabel(data.activeGame.status) : 'Idle'}
          </p>
          <p className="mt-3 text-sm text-foreground-dim">
            {data.activeGame?.updatedAt
              ? formatDateTime(data.activeGame.updatedAt)
              : 'Aucune custom live'}
          </p>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card elevated>
          <p className="label-mono">Queue live</p>
          <h2 className="mt-3 display-md text-foreground">Etat du lobby.</h2>
          <div className="mt-6 space-y-3">
            {data.queue ? (
              data.queue.players.map((player) => (
                <div
                  key={player.userId}
                  className="flex items-center justify-between gap-4 border-t border-hairline pt-3 first:border-t-0 first:pt-0"
                >
                  <div>
                    <p className="text-sm text-foreground">{player.username}</p>
                    <p className="mt-1 label-mono">
                      {player.selectedRole ?? 'Role?'} · Cost {player.selectedCost ?? '-'}
                    </p>
                  </div>
                  <p className="label-mono text-foreground-dim">
                    {player.isReady ? 'Ready' : 'Pending'}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-foreground-dim">Pas de queue active en ce moment.</p>
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <div className="border-b border-hairline pb-6">
            <p className="label-mono">Custom active</p>
            <h2 className="mt-3 display-md text-foreground">Etat live de la game.</h2>
          </div>

          {data.activeGame ? (
            <>
              <div className="grid gap-4 lg:grid-cols-3">
                <Card elevated>
                  <p className="label-mono">Status</p>
                  <p className="mt-3 text-lg text-foreground">
                    {activeStatusLabel(data.activeGame.status)}
                  </p>
                </Card>
                <Card elevated>
                  <p className="label-mono">Winner</p>
                  <p className="mt-3 text-lg text-foreground">
                    {data.activeGame.winner ? data.activeGame.winner.toUpperCase() : 'Waiting'}
                  </p>
                </Card>
                <Card elevated>
                  <p className="label-mono">Ecart de cost</p>
                  <p className="mt-3 text-lg text-foreground">
                    {data.activeGame.costDifference.toFixed(2)}
                  </p>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card elevated>
                  <p className="label-mono">Team 1</p>
                  <p className="mt-3 text-sm text-foreground-dim">
                    Cost moyen: {data.activeGame.team1.averageCost.toFixed(2)}
                  </p>
                  <div className="mt-5 space-y-3">
                    {data.activeGame.team1.players.map((player) => (
                      <div
                        key={player.userId}
                        className="border-t border-hairline pt-3 first:border-t-0 first:pt-0"
                      >
                        <p className="text-sm text-foreground">{player.username}</p>
                        <p className="mt-1 label-mono">
                          {(player.assignedRole ?? player.selectedRole ?? 'Role').toUpperCase()}
                          {' · '}Cost {player.selectedCost ?? '-'}
                        </p>
                        {player.tierLabel ? (
                          <p className="mt-1 text-xs text-foreground-dim">{player.tierLabel}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </Card>

                <Card elevated>
                  <p className="label-mono">Team 2</p>
                  <p className="mt-3 text-sm text-foreground-dim">
                    Cost moyen: {data.activeGame.team2.averageCost.toFixed(2)}
                  </p>
                  <div className="mt-5 space-y-3">
                    {data.activeGame.team2.players.map((player) => (
                      <div
                        key={player.userId}
                        className="border-t border-hairline pt-3 first:border-t-0 first:pt-0"
                      >
                        <p className="text-sm text-foreground">{player.username}</p>
                        <p className="mt-1 label-mono">
                          {(player.assignedRole ?? player.selectedRole ?? 'Role').toUpperCase()}
                          {' · '}Cost {player.selectedCost ?? '-'}
                        </p>
                        {player.tierLabel ? (
                          <p className="mt-1 text-xs text-foreground-dim">{player.tierLabel}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </>
          ) : (
            <Card elevated>
              <p className="text-sm text-foreground-dim">
                Aucune custom active n&apos;a encore ete persistee par le bot.
              </p>
            </Card>
          )}
        </div>
      </section>

      <section>
        <div className="flex flex-col gap-3 border-b border-hairline pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="label-mono">Leaderboard live</p>
            <h2 className="mt-3 display-md text-foreground">Classement saison 2.</h2>
          </div>
          <div className="flex flex-col items-start gap-4 md:items-end">
            <p className="max-w-xl text-sm leading-6 text-foreground-dim md:text-right">
              Les joueurs non classes restent visibles avec le sigle `NR`. On garde leur tier
              actuel, leur rating, et une raison courte quand ils ne sont pas encore eligibles.
            </p>
            <DeleteTestLeaderboardButton />
          </div>
        </div>

        <div className="mt-8 border border-hairline">
          <Table>
            <TableHeader>
              <tr>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-right">Rank</TableHead>
                <TableHead className="hidden text-right md:table-cell">Rating</TableHead>
                <TableHead className="hidden text-right md:table-cell">RD</TableHead>
                <TableHead className="text-right">Games</TableHead>
                <TableHead className="text-right">WR</TableHead>
                <TableHead className="hidden text-right lg:table-cell">MVP</TableHead>
                <TableHead className="hidden text-right lg:table-cell">ACE</TableHead>
                <TableHead className="hidden md:table-cell">Maj</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {data.leaderboard.map((player) => (
                <TableRow key={player.userId}>
                  <TableCell className="font-display text-lg text-foreground-muted">
                    {player.isRanked ? player.rank.toString().padStart(2, '0') : 'NR'}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-foreground">{player.username}</p>
                    <p className="mt-1 label-mono md:hidden">
                      {player.tier.tier === 'Placements'
                        ? `Placements · ${placementPreviewLabel(player) ?? 'Potentiel en attente'}`
                        : `${player.tier.tier}${
                            player.tier.subDivision ? ` ${player.tier.subDivision}` : ''
                          } · ${player.displayScore}/100`}
                    </p>
                    <p className="mt-1 text-xs text-foreground-dim">
                      MVP {player.mvpCount} · ACE {player.aceCount}
                    </p>
                    {!player.isRanked ? (
                      <div className="mt-1 flex flex-col gap-1 text-xs text-foreground-dim">
                        <p>{unrankedReasonLabel(player)}</p>
                        {player.unrankedReason === 'placements' ? (
                          <p>Rang possible: {placementPreviewLabel(player) ?? 'En attente'}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex justify-end">
                      <CustomRankBadge
                        tier={player.tier.tier}
                        subDivision={player.tier.subDivision}
                        displayScore={player.displayScore}
                        placementPreview={placementPreview(player)}
                        showScore={false}
                        size="sm"
                      />
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">
                    {player.rating}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">
                    {player.rd}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{player.totalGames}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPercent(player.winRate)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums lg:table-cell">
                    {player.mvpCount}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums lg:table-cell">
                    {player.aceCount}
                  </TableCell>
                  <TableCell className="hidden text-sm text-foreground-dim md:table-cell">
                    {player.isRanked
                      ? player.lastUpdated
                        ? formatCompactDate(player.lastUpdated)
                        : '-'
                      : player.unrankedReason === 'placements'
                        ? `${placementPreviewLabel(player) ?? 'Placements'} potentiel`
                        : (unrankedReasonLabel(player) ?? 'NR')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <div className="border-b border-hairline pb-6">
          <p className="label-mono">Derniers resultats</p>
          <h2 className="mt-3 display-md text-foreground">Recap des customs finies.</h2>
        </div>

        <div className="mt-8 grid gap-4 xl:grid-cols-2">
          {data.recentMatches.length > 0 ? (
            data.recentMatches.map((match) => (
              <Link key={match.matchId} href={`/custom/saison-2/match/${match.matchId}`} className="block">
                <Card elevated>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="label-mono">{match.matchId}</p>
                      <p className="mt-3 text-lg text-foreground">
                        Winner: {match.winner.toUpperCase()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-foreground-dim">
                        {match.resolvedAt ? formatCompactDate(match.resolvedAt) : 'Date inconnue'}
                      </p>
                      <p className="mt-2 label-mono text-foreground-dim">
                        {match.hasReplay ? 'Replay importe' : 'Ouvrir le detail'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="label-mono">Team 1 · {match.team1.averageCost.toFixed(2)}</p>
                      <p className="mt-2 text-sm leading-6 text-foreground-dim">
                        {match.team1.players.map((player) => player.username).join(', ')}
                      </p>
                    </div>
                    <div>
                      <p className="label-mono">Team 2 · {match.team2.averageCost.toFixed(2)}</p>
                      <p className="mt-2 text-sm leading-6 text-foreground-dim">
                        {match.team2.players.map((player) => player.username).join(', ')}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))
          ) : (
            <Card elevated>
              <p className="text-sm text-foreground-dim">
                Aucun resultat custom stocke pour le moment.
              </p>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
