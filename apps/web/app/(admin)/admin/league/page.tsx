import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { standings } from '@/lib/utils/mock-data';

export default function AdminLeaguePage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-kicker">Admin zone</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-white">Gestion ligue</h1>
      </div>
      <Card className="p-0">
        <div className="border-b border-white/8 px-6 py-5">
          <h2 className="font-display text-2xl font-bold text-white">Standings administration</h2>
        </div>
        <div className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead>Wins</TableHead>
                <TableHead>Losses</TableHead>
                <TableHead>Map diff</TableHead>
                <TableHead>Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standings.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-semibold text-white">{team.name}</TableCell>
                  <TableCell>{team.wins}</TableCell>
                  <TableCell>{team.losses}</TableCell>
                  <TableCell>{team.mapWins - team.mapLosses}</TableCell>
                  <TableCell>{team.points}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
