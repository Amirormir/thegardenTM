import { AdminMatchesManager } from '@/components/features/admin/admin-matches-manager';

export default function AdminMatchesPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-kicker">Admin zone</p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">Gestion matchs</h1>
      </div>
      <AdminMatchesManager />
    </div>
  );
}
