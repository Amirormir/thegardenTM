'use client';

import { useSession } from 'next-auth/react';
import { FreeAgentSignButton } from '@/components/features/transfermarket/free-agent-sign-button';
import { RiotFetchButton } from '@/components/features/transfermarket/riot-fetch-button';
import { TransferOfferButton } from '@/components/features/transfermarket/transfer-offer-button';

interface PlayerPublicActionsProps {
  playerId: string;
  playerTeamId: string | null;
  hasActiveContract: boolean;
}

export function PlayerPublicActions({
  playerId,
  playerTeamId,
  hasActiveContract,
}: PlayerPublicActionsProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const isCaptain = session?.user?.role === 'TEAM_CAPTAIN' || isAdmin;
  const userTeamId = session?.user?.teamId ?? null;

  const canOfferTransfer = Boolean(
    isCaptain && userTeamId && playerTeamId && playerTeamId !== userTeamId && hasActiveContract,
  );
  const canSignFreeAgent = Boolean(isCaptain && userTeamId && !playerTeamId);

  if (!isAdmin && !canOfferTransfer && !canSignFreeAgent) {
    return null;
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-5 label-mono">
      {isAdmin ? <RiotFetchButton playerId={playerId} /> : null}
      {canOfferTransfer ? <TransferOfferButton playerId={playerId} /> : null}
      {canSignFreeAgent ? <FreeAgentSignButton playerId={playerId} /> : null}
    </div>
  );
}
