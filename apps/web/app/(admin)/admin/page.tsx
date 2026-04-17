import { AdminOverview } from '@/components/features/admin/admin-overview';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/lib/utils/format';
import { getServerCaller } from '@/server/caller';

export default async function AdminDashboardPage() {
  const caller = await getServerCaller();
  const [stats, auditLog] = await Promise.all([
    caller.admin.getDashboardStats(),
    caller.admin.getAuditLog({ limit: 10 }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-kicker">Admin zone</p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">Dashboard admin</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
          {stats.currentSeason
            ? `Saison active : ${stats.currentSeason.name}`
            : 'Aucune saison active.'}
        </p>
      </div>
      <AdminOverview stats={stats} />
      <Card className="space-y-5">
        <div>
          <p className="text-kicker">Audit trail</p>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">Dernières actions</h2>
        </div>
        {auditLog.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLog.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-semibold text-white">{entry.action}</TableCell>
                  <TableCell>
                    {entry.entity} <span className="text-text-muted">#{entry.entityId.slice(0, 8)}</span>
                  </TableCell>
                  <TableCell>{entry.user.name ?? entry.user.email}</TableCell>
                  <TableCell className="text-text-secondary">
                    {formatDateTime(entry.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-text-secondary">Aucun événement d'audit.</p>
        )}
      </Card>
    </div>
  );
}
