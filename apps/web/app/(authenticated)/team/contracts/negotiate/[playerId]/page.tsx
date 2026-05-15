import { notFound, redirect } from 'next/navigation';
import { ContractNegotiator } from '@/components/features/team/contract-negotiator';
import { auth } from '@/lib/auth';
import { getServerCaller } from '@/server/caller';

interface PageProps {
  params: Promise<{ playerId: string }>;
}

export default async function ContractNegotiatePage({ params }: PageProps) {
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

  return (
    <div className="flex flex-col gap-12 md:gap-16">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ · Équipe · Contrats · Négociation</p>
        <h1 className="mt-4 display-lg text-foreground">
          Négocier — {player.displayName ?? player.gameName}.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-foreground-dim">
          Proposez des conditions contractuelles. Tout contrat est soumis à validation admin.
        </p>
      </header>

      <ContractNegotiator teamId={teamId} team={team} player={player} />
    </div>
  );
}
