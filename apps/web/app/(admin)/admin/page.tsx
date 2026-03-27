import { AdminOverview } from '@/components/features/admin/admin-overview';
import { Card } from '@/components/ui/card';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-kicker">Admin zone</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-white">Dashboard admin</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
          Base de pilotage back-office pour l’audit, la ligue et les opérations sur les données.
        </p>
      </div>
      <AdminOverview />
      <Card className="space-y-3">
        <p className="text-kicker">Ready for tRPC</p>
        <h2 className="font-display text-2xl font-bold text-white">Operational summary</h2>
        <p className="max-w-3xl text-sm leading-7 text-text-secondary">
          Cette zone est prête à consommer `admin.getDashboardStats` et `admin.getAuditLog`
          dès que la couche serveur est branchée.
        </p>
      </Card>
    </div>
  );
}
