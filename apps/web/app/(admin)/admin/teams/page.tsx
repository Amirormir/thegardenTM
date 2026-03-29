import { AdminTeamsManager } from '@/components/features/admin/admin-teams-manager';

export default function AdminTeamsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-kicker">Admin zone</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-white">Gestion équipes</h1>
      </div>
      <AdminTeamsManager />
    </div>
  );
}
