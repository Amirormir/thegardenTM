import type { TeamStanding } from '@nexus/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface StandingsTableProps {
  standings: TeamStanding[];
}

export function StandingsTable({ standings }: StandingsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>Team</TableHead>
          <TableHead>W</TableHead>
          <TableHead>L</TableHead>
          <TableHead>Maps</TableHead>
          <TableHead>Pts</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {standings.map((team, index) => (
          <TableRow key={team.id}>
            <TableCell className="font-mono text-text-secondary">{index + 1}</TableCell>
            <TableCell className="font-semibold text-white">{team.name}</TableCell>
            <TableCell>{team.wins}</TableCell>
            <TableCell>{team.losses}</TableCell>
            <TableCell className="text-text-secondary">
              {team.mapWins}-{team.mapLosses}
            </TableCell>
            <TableCell className="font-semibold text-accent-glow">{team.points}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
