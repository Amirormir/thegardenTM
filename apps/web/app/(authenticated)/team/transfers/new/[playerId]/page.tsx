import { notFound, redirect } from 'next/navigation';
import { TransferOfferComposer } from '@/components/features/team/transfer-offer-composer';
import { auth } from '@/lib/auth';
import { getServerCaller } from '@/server/caller';

interface PageProps {
  params: Promise<{ playerId: string }>;
}

export default async function TransferOfferNewPage({ params }: PageProps) {
  const { playerId } = await params;
  const session = await auth();
  const teamId = session?.user?.teamId;

  if (!teamId) {
    redirect('/');
  }

  const caller = await getServerCaller();

  const [player, team] = await Promise.all([
    caller.player.getById({ id: playerId }).catch(() => null),
    caller.team.getById({ id: teamId }),
  ]);

  if (!player) {
    notFound();
  }

  const activeContract = player.contracts[0];

  if (!player.teamId || !activeContract) {
    redirect(`/team/contracts/negotiate/${playerId}`);
  }

  if (player.teamId === teamId) {
    redirect(`/transfermarket/${playerId}`);
  }

  return (
    <div className="flex flex-col gap-12 md:gap-16">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ · Équipe · Transferts · Nouvelle offre</p>
        <h1 className="mt-4 display-lg text-foreground">
          Offre pour {player.displayName ?? player.gameName}.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-foreground-dim">
          Proposez une indemnité de transfert au capitaine adverse.
        </p>
      </header>

      <TransferOfferComposer
        buyerTeam={{
          id: team.id,
          name: team.name,
          transferBudget: team.transferBudget,
        }}
        player={{
          id: player.id,
          firstName: player.firstName,
          lastName: player.lastName,
          gameName: player.gameName,
          displayName: player.displayName,
          imageUrl: player.imageUrl,
          role: player.role,
          age: player.age,
          marketValue: player.marketValue,
          teamId: player.teamId,
          team: player.team,
          releaseClause: activeContract.releaseClause,
        }}
      />
    </div>
  );
}
