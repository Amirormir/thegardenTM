import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-kicker">{match.format}</p>
            <h1 className="mt-2 font-display text-4xl font-bold text-white">
              {match.homeTeam.name} vs {match.awayTeam.name}
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              {match.season.name} — {formatDateTime(match.scheduledAt)}
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 px-6 py-4 text-center">
            <p className="font-display text-4xl font-bold text-white">
              {match.homeScore} - {match.awayScore}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-text-secondary">
              {match.isCompleted ? 'Series completed' : 'Scheduled'}
            </p>
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
                  {game.playerStats.map((stat) => (
                    <TableRow key={stat.id}>
                      <TableCell className="font-semibold text-white">
                        {stat.player.gameName}
                        <span className="ml-2">
                          <Badge variant={stat.player.role}>{stat.player.role}</Badge>
                        </span>
                      </TableCell>
                      <TableCell>{stat.champion}</TableCell>
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
