import { AdminPlayersManager } from '@/components/features/admin/admin-players-manager';
import { TRPCProvider } from '@/lib/trpc/provider';

export default function AdminPlayersPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-kicker">Admin zone</p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">Gestion joueurs</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary">
          Back-office dedie au transfermarket pour piloter les profils, les valorisations
          historiques et le palmares des joueurs.
        </p>
      </div>

      <TRPCProvider>
        <AdminPlayersManager />
      </TRPCProvider>
    </div>
  );
}
