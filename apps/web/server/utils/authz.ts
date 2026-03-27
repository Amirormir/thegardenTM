import { TRPCError } from '@trpc/server';

interface TeamAccessUser {
  role: string;
  teamId?: string | null;
}

export function ensureTeamAccess(user: TeamAccessUser, teamId: string) {
  if (user.role === 'ADMIN') {
    return;
  }

  if (user.role !== 'TEAM_CAPTAIN' || user.teamId !== teamId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You can only manage your own team resources.',
    });
  }
}
