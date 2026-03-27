import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { matches, teams } from '@/lib/utils/mock-data';

interface MatchDetailPageProps {
  params: Promise<{
    matchId: string;
  }>;
}

export default async function MatchDetailPage({ params }: MatchDetailPageProps) {
  const { matchId } = await params;
  const match = matches.find((entry) => entry.id === matchId);

  if (!match) {
    notFound();
  }

  const homeTeam = teams.find((team) => team.id === match.homeTeamId);
  const awayTeam = teams.find((team) => team.id === match.awayTeamId);

  if (!homeTeam || !awayTeam) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <Card elevated className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-kicker">{match.format}</p>
            <h1 className="mt-2 font-display text-4xl font-bold text-white">
              {homeTeam.name} vs {awayTeam.name}
            </h1>
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
      </Card>

      <Card className="space-y-5">
        <div>
          <p className="text-kicker">Game one sample</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-white">Scoreboard</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead>Champion</TableHead>
              <TableHead>K / D / A</TableHead>
              <TableHead>CS</TableHead>
              <TableHead>Gold</TableHead>
              <TableHead>Vision</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              ['Aero', 'KaiSa', '9 / 2 / 7', '301', '16 120', '24'],
              ['ZeroPulse', 'Azir', '6 / 1 / 13', '289', '15 400', '19'],
              ['ScarletFox', 'Taliyah', '4 / 5 / 10', '262', '13 980', '34'],
              ['Wardlock', 'Rell', '0 / 4 / 18', '42', '9 120', '67'],
            ].map((row) => (
              <TableRow key={`${row[0]}-${row[1]}`}>
                {row.map((cell) => (
                  <TableCell key={cell}>{cell}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
