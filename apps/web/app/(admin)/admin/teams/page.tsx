import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { standings, teams } from '@/lib/utils/mock-data';

export default function AdminTeamsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-kicker">Admin zone</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-white">Gestion équipes</h1>
      </div>
      <Card className="p-0">
        <div className="border-b border-white/8 px-6 py-5">
          <h2 className="font-display text-2xl font-bold text-white">Teams overview</h2>
        </div>
        <div className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Wins</TableHead>
                <TableHead>Losses</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((team) => {
                const standing = standings.find((entry) => entry.id === team.id);

                return (
                  <TableRow key={team.id}>
                    <TableCell className="font-semibold text-white">{team.name}</TableCell>
                    <TableCell>{team.shortCode}</TableCell>
                    <TableCell>{standing?.wins ?? 0}</TableCell>
                    <TableCell>{standing?.losses ?? 0}</TableCell>
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
