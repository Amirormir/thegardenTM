import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { DraftCreateForm } from '@/components/features/draft/draft-create-form';
import { TRPCProvider } from '@/lib/trpc/provider';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Nouveau draft — The Garden',
};

export default async function NewDraftPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login?callbackUrl=/draft/new');
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/draft');
  }

  return (
    <div className="flex flex-col gap-16 md:gap-20">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ · Draft · Nouveau</p>
        <h1 className="mt-4 display-lg text-foreground">Planifier un draft.</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-foreground-dim">
          Choisis un match du split en cours, fixe le côté Blue et le numéro de partie. La
          salle sera créée en statut Lobby, prête à être démarrée.
        </p>
      </header>

      <TRPCProvider>
        <DraftCreateForm />
      </TRPCProvider>
    </div>
  );
}
