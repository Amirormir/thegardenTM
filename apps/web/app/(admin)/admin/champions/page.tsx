import { AdminChampionsManager } from '@/components/features/admin/admin-champions-manager';
import { TRPCProvider } from '@/lib/trpc/provider';

export default function AdminChampionsPage() {
  return (
    <div className="flex flex-col gap-16 md:gap-20">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ · Admin · Champions</p>
        <h1 className="mt-4 display-lg text-foreground">Pool de champions.</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-foreground-dim">
          Synchronise la liste depuis Data Dragon, affecte les rôles par défaut et désactive
          les champions qui ne doivent pas apparaître dans la phase de draft.
        </p>
      </header>

      <TRPCProvider>
        <AdminChampionsManager />
      </TRPCProvider>
    </div>
  );
}
