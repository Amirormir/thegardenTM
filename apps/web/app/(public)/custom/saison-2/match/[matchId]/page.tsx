import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChampionIcon } from '@/components/ui/champion-icon';
import { Card } from '@/components/ui/card';
import { ItemRow } from '@/components/ui/item-icon';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CustomMatchReplayImporter } from '@/components/features/custom/custom-match-replay-importer';
import { getSeasonTwoMatchDetail } from '@/lib/custom/season-two-match-detail';
import { cn } from '@/lib/utils/cn';
import { formatDateTime } from '@/lib/utils/format';

interface CustomSeasonTwoMatchPageProps {
  params: Promise<{
    matchId: string;
  }>;
}

export const revalidate = 15;

function formatSigned(value: number) {
  return `${value >= 0 ? '+' : ''}${value}`;
}

export default async function CustomSeasonTwoMatchPage({
  params,
}: CustomSeasonTwoMatchPageProps) {
  const { matchId } = await params;
  const match = await getSeasonTwoMatchDetail(matchId);

  if (!match) {
    notFound();
  }

  const importedPlayersByTeam = {
    team1:
      match.importedReplay?.players.filter((player) => player.teamKey === 'team1') ?? [],
    team2:
      match.importedReplay?.players.filter((player) => player.teamKey === 'team2') ?? [],
  };

  return (
    <div className="flex flex-col gap-16 md:gap-20">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">
          <Link href="/custom/saison-2" className="hover:text-accent">
            Custom · Saison 2
          </Link>
          {' · '}
          {match.matchId}
        </p>
        <h1 className="mt-4 display-lg text-foreground">Historique custom detaille.</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-foreground-dim">
          Resume du match, deltas de rating et, si besoin, import du replay `.rofl` via le
          microservice Python.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <Card elevated>
          <p className="label-mono">Winner</p>
          <p className="mt-3 text-lg text-foreground">
            {match.winner === 'team1' ? 'Team 1' : 'Team 2'}
          </p>
        </Card>
        <Card elevated>
          <p className="label-mono">MVP</p>
          <p className="mt-3 text-lg text-foreground">{match.mvpUsername ?? 'Aucun'}</p>
        </Card>
        <Card elevated>
          <p className="label-mono">ACE</p>
          <p className="mt-3 text-lg text-foreground">{match.aceUsername ?? 'Aucun'}</p>
        </Card>
        <Card elevated>
          <p className="label-mono">Date</p>
          <p className="mt-3 text-lg text-foreground">
            {match.resolvedAt ? formatDateTime(match.resolvedAt) : 'Inconnue'}
          </p>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        {(['team1', 'team2'] as const).map((teamKey) => {
          const team = match[teamKey];
          const isWinner = match.winner === teamKey;

          return (
            <Card key={teamKey} elevated>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="label-mono">
                    {teamKey === 'team1' ? 'Team 1' : 'Team 2'} · Cost moyen {team.averageCost.toFixed(2)}
                  </p>
                  <h2 className="mt-3 display-md text-foreground">
                    {isWinner ? 'Victoire' : 'Defaite'}
                  </h2>
                </div>
                <div className="text-right label-mono">
                  <p>Rating {team.averageRating ? Math.round(team.averageRating) : '-'}</p>
                  <p className="mt-1">RD {team.averageRD ? Math.round(team.averageRD) : '-'}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                {team.players.map((player) => (
                  <div
                    key={player.userId}
                    className="flex items-center justify-between gap-4 border-t border-hairline pt-3 first:border-t-0 first:pt-0"
                  >
                    <div>
                      <p className="text-sm text-foreground">{player.username}</p>
                      <p className="mt-1 label-mono">
                        {player.role} · Cost {player.cost}
                        {player.performanceRole ? ` · ${player.performanceRole}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-foreground">
                        {player.displayAfter}/100 ({formatSigned(player.displayDelta)})
                      </p>
                      <p className="mt-1 label-mono">
                        {Math.round(player.ratingAfter)} ({formatSigned(Math.round(player.ratingDelta))})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </section>

      <section>
        <CustomMatchReplayImporter
          matchId={match.matchId}
          hasReplay={match.importedReplay != null}
          team1Players={match.team1.players}
          team2Players={match.team2.players}
        />
      </section>

      <section>
        <div className="border-b border-hairline pb-6">
          <p className="label-mono">Replay import</p>
          <h2 className="mt-3 display-md text-foreground">Stats de la game.</h2>
          {match.importedReplay ? (
            <p className="mt-3 text-sm leading-6 text-foreground-dim">
              Replay importe le {formatDateTime(match.importedReplay.importedAt)}
              {match.importedReplay.importedBy.name
                ? ` par ${match.importedReplay.importedBy.name}`
                : ''}. BLUE = {match.importedReplay.blueTeam === 'team1' ? 'Team 1' : 'Team 2'}.
            </p>
          ) : (
            <p className="mt-3 text-sm leading-6 text-foreground-dim">
              Aucun replay importe pour ce match custom pour le moment.
            </p>
          )}
        </div>

        {match.importedReplay ? (
          <div className="mt-8 flex flex-col gap-8">
            <div className="grid gap-4 md:grid-cols-4">
              <Card elevated>
                <p className="label-mono">Winner replay</p>
                <p className="mt-3 text-lg text-foreground">
                  {match.importedReplay.winnerTeam === 'team1'
                    ? 'Team 1'
                    : match.importedReplay.winnerTeam === 'team2'
                      ? 'Team 2'
                      : 'Inconnu'}
                </p>
              </Card>
              <Card elevated>
                <p className="label-mono">Duree</p>
                <p className="mt-3 text-lg text-foreground">
                  {Math.floor(match.importedReplay.game.duration_seconds / 60)}m{' '}
                  {(match.importedReplay.game.duration_seconds % 60).toString().padStart(2, '0')}s
                </p>
              </Card>
              <Card elevated>
                <p className="label-mono">Version</p>
                <p className="mt-3 text-lg text-foreground">
                  {match.importedReplay.game.game_version ?? match.importedReplay.game.rofl_version}
                </p>
              </Card>
              <Card elevated>
                <p className="label-mono">Mode</p>
                <p className="mt-3 text-lg text-foreground">
                  {match.importedReplay.game.game_mode ?? 'Classique'}
                </p>
              </Card>
            </div>

            {(['team1', 'team2'] as const).map((teamKey) => {
              const replayPlayers = importedPlayersByTeam[teamKey];
              const isWinner = match.importedReplay?.winnerTeam === teamKey;

              return (
                <div key={teamKey}>
                  <div
                    className={cn(
                      'flex items-center justify-between gap-4 border-l-2 py-1 pl-4',
                      isWinner ? 'border-l-accent' : 'border-l-hairline',
                    )}
                  >
                    <p className="label-mono">
                      {teamKey === 'team1' ? 'Team 1' : 'Team 2'} ·{' '}
                      {teamKey === match.importedReplay?.blueTeam ? 'BLUE side' : 'RED side'}
                    </p>
                    <span className="label-mono text-foreground-dim">
                      {isWinner ? 'Victoire' : 'Defaite'}
                    </span>
                  </div>

                  <div className="mt-4 overflow-x-auto border-t border-hairline">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Joueur</TableHead>
                          <TableHead>Champion</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>K / D / A</TableHead>
                          <TableHead>CS</TableHead>
                          <TableHead>Gold</TableHead>
                          <TableHead>Damage</TableHead>
                          <TableHead>Vision</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {replayPlayers.map((player) => {
                          const specialLabel =
                            player.userId === match.mvpUserId
                              ? 'MVP'
                              : player.userId === match.aceUserId
                                ? 'ACE'
                                : null;

                          return (
                            <TableRow key={`${player.side}-${player.positionInTeam}-${player.userId}`}>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <p className="text-sm text-foreground">{player.username}</p>
                                  <p className="label-mono">
                                    {player.role}
                                    {specialLabel ? ` · ${specialLabel}` : ''}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="flex items-center gap-2">
                                  <ChampionIcon championId={player.championInternal} size="sm" />
                                  {player.championDisplay ?? player.championInternal}
                                </span>
                              </TableCell>
                              <TableCell>
                                <ItemRow items={player.items} size="sm" />
                              </TableCell>
                              <TableCell className="tabular-nums">
                                {player.prisma.kills} / {player.prisma.deaths} / {player.prisma.assists}
                              </TableCell>
                              <TableCell className="tabular-nums">{player.prisma.cs}</TableCell>
                              <TableCell className="tabular-nums">
                                {player.prisma.gold.toLocaleString('fr-FR')}
                              </TableCell>
                              <TableCell className="tabular-nums">
                                {player.prisma.damage.toLocaleString('fr-FR')}
                              </TableCell>
                              <TableCell className="tabular-nums">{player.prisma.visionScore}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>
    </div>
  );
}
