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

export default function AdminMatchesPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-kicker">Admin zone</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-white">Gestion matchs</h1>
      </div>
      <Card className="p-0">
        <div className="border-b border-white/8 px-6 py-5">
          <h2 className="font-display text-2xl font-bold text-white">Series board</h2>
        </div>
        <div className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Home</TableHead>
                <TableHead>Away</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map((match) => {
                const home = teams.find((team) => team.id === match.homeTeamId);
                const away = teams.find((team) => team.id === match.awayTeamId);

                return (
                  <TableRow key={match.id}>
                    <TableCell className="font-semibold text-white">{home?.name ?? '-'}</TableCell>
                    <TableCell>{away?.name ?? '-'}</TableCell>
                    <TableCell>{match.format}</TableCell>
                    <TableCell>
                      {match.homeScore} - {match.awayScore}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
