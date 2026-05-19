import Link from 'next/link';
import { Plus } from 'lucide-react';
import { auth } from '@/lib/auth';
import { DraftList } from '@/components/features/draft/draft-list';
import { TRPCProvider } from '@/lib/trpc/provider';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Draft — The Garden',
  description: 'Pick & ban en direct, archives et planification des drafts compétitifs.',
};

export default async function DraftIndexPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === 'ADMIN';

  return (
    <div className="flex flex-col gap-16 md:gap-20">
      <header className="border-b border-hairline pb-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="breadcrumb-mono">§ · Draft · Pick &amp; ban</p>
            <h1 className="mt-4 display-lg text-foreground">Salles de draft.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-foreground-dim">
              Suis les drafts en direct, rejoue les phases verrouillées et planifie les
              prochaines confrontations.
            </p>
          </div>
          {isAdmin ? (
            <Link
              href="/draft/new"
              className="inline-flex items-center gap-2 border border-accent bg-accent/10 px-4 py-2 text-sm text-foreground transition-colors duration-150 hover:bg-accent/20"
            >
              <Plus className="h-4 w-4" />
              Nouveau draft
            </Link>
          ) : null}
        </div>
      </header>

      <TRPCProvider>
        <DraftList />
      </TRPCProvider>
    </div>
  );
}
