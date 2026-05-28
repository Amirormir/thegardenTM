'use client';

import { useRouter } from 'next/navigation';
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
type Role = typeof ROLES[number];

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
  const router = useRouter();
  const utils = api.useUtils();
  const updateRole = api.team.updatePlayerRole.useMutation();

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [optimisticRoles, setOptimisticRoles] = useState<Record<string, Role>>({});
  const [error, setError] = useState<string | null>(null);

  async function handleRoleChange(playerId: string, teamRole: Role) {
    setUpdatingId(playerId);
    setError(null);
    setOptimisticRoles((prev) => ({ ...prev, [playerId]: teamRole }));
    try {
      await updateRole.mutateAsync({ playerId, teamRole });
      await utils.team.getById.invalidate({ id: teamId });
      router.refresh();
    } catch (e) {
      setOptimisticRoles((prev) => {
        const next = { ...prev };
        delete next[playerId];
        return next;
      });
      setError(e instanceof Error ? e.message : 'Mise à jour du rôle échouée.');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <div className="border-l-2 border-l-[color:var(--loss)] border-y border-r border-hairline bg-surface px-4 py-3 label-mono text-[color:var(--loss)]">
          {error}
        </div>
      ) : null}
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
            const displayRole = optimisticRoles[player.id] ?? player.teamRole ?? player.role;
            const isRoleOverridden = displayRole !== player.role;

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
                      onChange={(e) => handleRoleChange(player.id, e.target.value as Role)}
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
    </div>
  );
}
