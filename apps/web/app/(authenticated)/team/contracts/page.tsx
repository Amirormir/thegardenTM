import { redirect } from 'next/navigation';
import { ContractManager } from '@/components/features/team/contract-manager';
import { auth } from '@/lib/auth';
import { getServerCaller } from '@/server/caller';

export default async function TeamContractsPage() {
  const session = await auth();
  const teamId = session?.user?.teamId;

  if (!teamId) {
    redirect('/');
  }

  const caller = await getServerCaller();
  const team = await caller.team.getById({ id: teamId });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-kicker">Protected area</p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">
          Contrats - {team.name}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
          Espace dedie pour proposer, prolonger ou rompre les contrats de l'equipe.
        </p>
      </div>

      <ContractManager teamId={teamId} />
    </div>
  );
}
