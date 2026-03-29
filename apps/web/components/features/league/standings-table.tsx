import type { TeamStanding } from '@nexus/types';
import Link from 'next/link';
import { TeamAvatar } from '@/components/ui/team-avatar';
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
          <TableRow key={team.id} className="transition hover:bg-white/5">
            <TableCell className="font-mono text-text-secondary">{index + 1}</TableCell>
            <TableCell className="font-semibold text-white">
              <Link
                href={`/league/teams/${team.slug}`}
                className="flex items-center gap-3 rounded-2xl py-1 transition hover:text-accent-glow"
              >
                <TeamAvatar
                  name={team.name}
                  shortCode={team.shortCode}
                  logoUrl={team.logoUrl}
                  size="sm"
                />
                <div>
                  <p className="font-semibold text-white">{team.name}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">
                    {team.shortCode}
                  </p>
                </div>
              </Link>
            </TableCell>
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
