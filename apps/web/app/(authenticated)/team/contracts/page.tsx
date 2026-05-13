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
    <div className="flex flex-col gap-16 md:gap-20">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ · Équipe · Contrats</p>
        <h1 className="mt-4 display-lg text-foreground">Contrats — {team.name}.</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-foreground-dim">
          Espace dédié pour proposer, prolonger ou rompre les contrats de l&apos;équipe.
        </p>
      </header>

      <ContractManager teamId={teamId} />
    </div>
  );
}
