import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  seasonOneLeaderboardSnapshot,
  seasonOneLeaderboardSnapshotMeta,
} from '@/lib/custom/season-one-leaderboard';
import { cn } from '@/lib/utils/cn';
import { formatCompactDate, formatDateTime } from '@/lib/utils/format';

function formatPercent(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function SeasonOneLeaderboard() {
  const rows = seasonOneLeaderboardSnapshot.map((entry, index) => ({
    ...entry,
    rank: index + 1,
    winRate: entry.totalGames > 0 ? entry.wins / entry.totalGames : 0,
  }));

  const podium = rows.slice(0, 3);

  return (
    <div className="flex flex-col gap-16 md:gap-20">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ 05 · Custom · Saison 1</p>
        <h1 className="mt-4 display-lg text-foreground">Leaderboard archive.</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-foreground-dim">
          Snapshot local du classement custom recopie depuis Mongo afin de conserver la saison 1
          sur le site meme apres le reset de la base.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card elevated>
          <p className="label-mono">Snapshot capture</p>
          <p className="mt-3 display-md text-foreground">
            {formatCompactDate(seasonOneLeaderboardSnapshotMeta.capturedAt)}
          </p>
          <p className="mt-3 text-sm leading-6 text-foreground-dim">
            {formatDateTime(seasonOneLeaderboardSnapshotMeta.capturedAt)}
          </p>
        </Card>

        <Card elevated>
          <p className="label-mono">Joueurs figes</p>
          <p className="mt-3 display-md text-foreground">
            {seasonOneLeaderboardSnapshotMeta.totalPlayers.toString().padStart(2, '0')}
          </p>
          <p className="mt-3 text-sm leading-6 text-foreground-dim">
            Source: {seasonOneLeaderboardSnapshotMeta.source}
          </p>
        </Card>

        <Card elevated>
          <p className="label-mono">Games archivees</p>
          <p className="mt-3 display-md text-foreground">
            {seasonOneLeaderboardSnapshotMeta.totalGames}
          </p>
          <p className="mt-3 text-sm leading-6 text-foreground-dim">
            Plus haut elo: {seasonOneLeaderboardSnapshotMeta.highestElo}
          </p>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {podium.map((player) => (
          <Card
            key={player.userId}
            elevated
            className={cn(
              'border-l-2',
              player.rank === 1 ? 'border-l-accent' : 'border-l-hairline-strong',
            )}
          >
            <p className="label-mono">Top {player.rank.toString().padStart(2, '0')}</p>
            <h2 className="mt-4 display-md text-foreground">{player.username}</h2>
            <div className="mt-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-4xl font-display tracking-tight text-accent">{player.elo}</p>
                <p className="mt-1 label-mono">Elo</p>
              </div>
              <div className="text-right">
                <p className="text-lg text-foreground">
                  {player.wins}-{player.losses}
                </p>
                <p className="mt-1 label-mono">{formatPercent(player.winRate)} WR</p>
              </div>
            </div>
          </Card>
        ))}
      </section>

      <section>
        <div className="flex flex-col gap-3 border-b border-hairline pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="label-mono">Classement complet</p>
            <h2 className="mt-3 display-md text-foreground">61 joueurs sauvegardes.</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-foreground-dim">
            Les valeurs ci-dessous sont maintenant embarquees dans le site. La saison 1 restera
            consultable meme si la collection Mongo est videe ensuite.
          </p>
        </div>

        <div className="mt-8 border border-hairline">
          <Table>
            <TableHeader>
              <tr>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Joueur</TableHead>
                <TableHead className="text-right">Elo</TableHead>
                <TableHead className="hidden text-right md:table-cell">V</TableHead>
                <TableHead className="hidden text-right md:table-cell">D</TableHead>
                <TableHead className="text-right">Games</TableHead>
                <TableHead className="text-right">WR</TableHead>
                <TableHead className="hidden md:table-cell">Maj</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {rows.map((player) => (
                <TableRow
                  key={player.userId}
                  className={cn(player.rank <= 3 && 'bg-surface/70')}
                >
                  <TableCell className="font-display text-lg text-foreground-muted">
                    {player.rank.toString().padStart(2, '0')}
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{player.username}</p>
                      <p className="mt-1 label-mono md:hidden">
                        {player.wins}-{player.losses} · {formatCompactDate(player.lastUpdated)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {player.elo}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">
                    {player.wins}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">
                    {player.losses}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {player.totalGames}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPercent(player.winRate)}
                  </TableCell>
                  <TableCell className="hidden text-sm text-foreground-dim md:table-cell">
                    {formatCompactDate(player.lastUpdated)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
