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
          <TableRow key={team.id} className="transition hover:bg-white/[0.04]">
            <TableCell className="font-display text-foreground-dim tabular-nums">{index + 1}</TableCell>
            <TableCell className="font-semibold text-white">
              <Link
                href={`/league/teams/${team.slug}`}
                className="flex items-center gap-3 rounded-xl py-1 transition hover:text-accent"
              >
                <TeamAvatar
                  name={team.name}
                  shortCode={team.shortCode}
                  logoUrl={team.logoUrl}
                  size="sm"
                />
                <div>
                  <p className="font-semibold text-white">{team.name}</p>
                  <p className="text-[0.65rem] uppercase tracking-[0.06em] text-foreground-dim">
                    {team.shortCode}
                  </p>
                </div>
              </Link>
            </TableCell>
            <TableCell className="tabular-nums">{team.wins}</TableCell>
            <TableCell className="tabular-nums">{team.losses}</TableCell>
            <TableCell className="text-foreground-dim tabular-nums">
              {team.mapWins}-{team.mapLosses}
            </TableCell>
            <TableCell className="font-semibold text-accent tabular-nums">{team.points}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
