import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ChampionIcon } from '@/components/ui/champion-icon';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlayerLink } from '@/components/ui/player-link';
import { TeamAvatar } from '@/components/ui/team-avatar';
import { formatDateTime } from '@/lib/utils/format';
import { getServerCaller } from '@/server/caller';

interface MatchDetailPageProps {
  params: Promise<{
    matchId: string;
  }>;
}

export const revalidate = 60;

export default async function MatchDetailPage({ params }: MatchDetailPageProps) {
  const { matchId } = await params;
  const caller = await getServerCaller();

  let match: Awaited<ReturnType<typeof caller.match.getById>>;
  try {
    match = await caller.match.getById({ id: matchId });
  } catch {
    notFound();
  }

  return (
    <div className="space-y-8">
      <Card elevated className="space-y-6">
        <p className="text-kicker">
          {match.format} — {match.season.name} — {formatDateTime(match.scheduledAt)}
        </p>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <TeamAvatar
              name={match.homeTeam.name}
              shortCode={match.homeTeam.shortCode}
              logoUrl={match.homeTeam.logoUrl}
              size="lg"
            />
            <div>
              <p className="font-display text-xl font-bold text-white sm:text-2xl">
                {match.homeTeam.name}
              </p>
              <p className="text-xs uppercase tracking-[0.16em] text-text-secondary">
                {match.homeTeam.shortCode}
              </p>
            </div>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 px-6 py-4 text-center">
            <p className="font-display text-4xl font-bold text-white">
              {match.homeScore} - {match.awayScore}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-text-secondary">
              {match.isCompleted ? 'Final' : 'Scheduled'}
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <TeamAvatar
              name={match.awayTeam.name}
              shortCode={match.awayTeam.shortCode}
              logoUrl={match.awayTeam.logoUrl}
              size="lg"
            />
            <div>
              <p className="font-display text-xl font-bold text-white sm:text-2xl">
                {match.awayTeam.name}
              </p>
              <p className="text-xs uppercase tracking-[0.16em] text-text-secondary">
                {match.awayTeam.shortCode}
              </p>
            </div>
          </div>
        </div>
        {match.notes ? (
          <p className="text-sm leading-7 text-text-secondary">{match.notes}</p>
        ) : null}
      </Card>

      {match.games.length > 0 ? (
        match.games.map((game) => (
          <Card key={game.id} className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-kicker">Game {game.gameNumber}</p>
                <h2 className="mt-2 font-display text-3xl font-bold text-white">Scoreboard</h2>
              </div>
              <div className="flex items-center gap-3">
                {game.durationSeconds ? (
                  <span className="text-xs uppercase tracking-[0.18em] text-text-secondary">
                    {Math.floor(game.durationSeconds / 60)}m {game.durationSeconds % 60}s
                  </span>
                ) : null}
                {game.winnerTeamId ? (
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                    {game.winnerTeamId === match.homeTeam.id
                      ? match.homeTeam.shortCode
                      : match.awayTeam.shortCode}{' '}
                    WIN
                  </span>
                ) : null}
              </div>
            </div>
            {game.playerStats.length > 0 ? (
              <>
                {(['BLUE', 'RED'] as const).map((side) => {
                  const sideStats = game.playerStats.filter((s) => s.side === side);
                  if (sideStats.length === 0) return null;
                  const sideTeamId = side === 'BLUE' ? game.blueTeamId : game.redTeamId;
                  const sideTeamName =
                    sideTeamId === match.homeTeam.id
                      ? match.homeTeam.shortCode
                      : match.awayTeam.shortCode;
                  return (
                    <div key={side} className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${side === 'BLUE' ? 'bg-sky-400' : 'bg-rose-400'}`}
                        />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                          {side} side — {sideTeamName}
                        </span>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Player</TableHead>
                            <TableHead>Champion</TableHead>
                            <TableHead>K / D / A</TableHead>
                            <TableHead>CS</TableHead>
                            <TableHead>Gold</TableHead>
                            <TableHead>Damage</TableHead>
                            <TableHead>Vision</TableHead>
                            <TableHead>Result</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sideStats.map((stat) => (
                            <TableRow key={stat.id}>
                              <TableCell className="font-semibold text-white">
                                <PlayerLink
                                  playerId={stat.player.id}
                                  className="font-semibold text-white"
                                >
                                  {stat.player.displayName}
                                </PlayerLink>
                                <span className="ml-2">
                                  <Badge variant={stat.player.role}>{stat.player.role}</Badge>
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="flex items-center gap-2">
                                  <ChampionIcon championId={stat.champion} size="sm" />
                                  {stat.champion}
                                </span>
                              </TableCell>
                              <TableCell>
                                {stat.kills} / {stat.deaths} / {stat.assists}
                              </TableCell>
                              <TableCell>{stat.cs}</TableCell>
                              <TableCell>{stat.gold.toLocaleString('fr-FR')}</TableCell>
                              <TableCell>{stat.damage.toLocaleString('fr-FR')}</TableCell>
                              <TableCell>{stat.visionScore}</TableCell>
                              <TableCell>
                                <span
                                  className={
                                    stat.result === 'WIN'
                                      ? 'font-semibold text-emerald-400'
                                      : 'text-rose-400'
                                  }
                                >
                                  {stat.result}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })}
              </>
            ) : (
              <p className="text-sm text-text-secondary">Aucune statistique joueur pour cette game.</p>
            )}
          </Card>
        ))
      ) : (
        <Card>
          <p className="text-sm text-text-secondary">
            Aucune game enregistrée pour ce match.
          </p>
        </Card>
      )}
    </div>
  );
}
