import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { players } from '@/lib/utils/mock-data';

export default function AdminPlayersPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-kicker">Admin zone</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-white">Gestion joueurs</h1>
      </div>
      <Card className="p-0">
        <div className="border-b border-white/8 px-6 py-5">
          <h2 className="font-display text-2xl font-bold text-white">Player registry</h2>
        </div>
        <div className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Market value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((player) => (
                <TableRow key={player.id}>
                  <TableCell className="font-semibold text-white">{player.gameName}</TableCell>
                  <TableCell>{player.teamName}</TableCell>
                  <TableCell>{player.role}</TableCell>
                  <TableCell>{player.marketValue.toLocaleString('fr-FR')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
