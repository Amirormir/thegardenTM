'use client';

import { useState } from 'react';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlayerLink } from '@/components/ui/player-link';
import { api } from '@/lib/trpc/react';
import { formatCurrency } from '@/lib/utils/format';

const ROLES = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'] as const;

interface RosterPlayer {
  id: string;
  displayName: string;
  role: string;
  teamRole: string | null;
  salary: number;
  marketValue: number;
}

interface RosterTableProps {
  players: RosterPlayer[];
  teamId: string;
}

export function RosterTable({ players, teamId }: RosterTableProps) {
  const utils = api.useUtils();
  const updateRole = api.team.updatePlayerRole.useMutation({
    onSuccess: () => {
      void utils.team.getById.invalidate({ id: teamId });
    },
  });

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleRoleChange(playerId: string, teamRole: string) {
    setUpdatingId(playerId);
    try {
      await updateRole.mutateAsync({
        playerId,
        teamRole: teamRole as typeof ROLES[number],
      });
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Player</TableHead>
          <TableHead>Role originel</TableHead>
          <TableHead>Role equipe</TableHead>
          <TableHead>Salary</TableHead>
          <TableHead>Market value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {players.map((player) => {
          const displayRole = player.teamRole ?? player.role;
          const isRoleOverridden = player.teamRole !== null && player.teamRole !== player.role;

          return (
            <TableRow key={player.id}>
              <TableCell>
                <PlayerLink playerId={player.id} className="font-display text-foreground">
                  {player.displayName}
                </PlayerLink>
              </TableCell>
              <TableCell>
                <Badge variant={player.role as BadgeVariant}>{player.role}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Select
                    value={displayRole}
                    onChange={(e) => handleRoleChange(player.id, e.target.value)}
                    disabled={updatingId === player.id}
                    className="w-[130px]"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </Select>
                  {isRoleOverridden ? (
                    <span className="label-mono text-accent">modifié</span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>{formatCurrency(player.salary)}</TableCell>
              <TableCell>{formatCurrency(player.marketValue)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
