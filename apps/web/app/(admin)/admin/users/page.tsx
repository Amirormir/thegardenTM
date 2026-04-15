import { AdminUsersManager } from '@/components/features/admin/admin-users-manager';

export default function AdminUsersPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-kicker">Admin zone</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-white">Gestion utilisateurs</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
          Attribuez les roles et associez les chefs d&apos;equipe a leurs equipes. Plusieurs
          capitaines par equipe sont possibles.
        </p>
      </div>
      <AdminUsersManager />
    </div>
  );
}
