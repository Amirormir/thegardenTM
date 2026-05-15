import { notFound, redirect } from 'next/navigation';
import { TransferNegotiator } from '@/components/features/team/transfer-negotiator';
import { auth } from '@/lib/auth';
import { getServerCaller } from '@/server/caller';

interface PageProps {
  params: Promise<{ offerId: string }>;
}

export default async function TransferNegotiatePage({ params }: PageProps) {
  const { offerId } = await params;
  const session = await auth();
  const teamId = session?.user?.teamId;

  if (!teamId) {
    redirect('/');
  }

  const caller = await getServerCaller();

  const offer = await caller.transfer.getById({ id: offerId }).catch(() => null);

  if (!offer) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-12 md:gap-16">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ · Équipe · Transferts · Négociation</p>
        <h1 className="mt-4 display-lg text-foreground">
          Transfert — {offer.player.displayName}.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-foreground-dim">
          Suivi de l&apos;offre et création du contrat lié au transfert.
        </p>
      </header>

      <TransferNegotiator teamId={teamId} offer={offer} />
    </div>
  );
}
