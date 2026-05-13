import { AdminPlayersManager } from '@/components/features/admin/admin-players-manager';
import { TRPCProvider } from '@/lib/trpc/provider';

export default function AdminPlayersPage() {
  return (
    <div className="flex flex-col gap-16 md:gap-20">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ · Admin · Joueurs</p>
        <h1 className="mt-4 display-lg text-foreground">Gestion joueurs.</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-foreground-dim">
          Back-office dédié au transfermarket pour piloter les profils, les valorisations
          historiques et le palmarès des joueurs.
        </p>
      </header>

      <TRPCProvider>
        <AdminPlayersManager />
      </TRPCProvider>
    </div>
  );
}
