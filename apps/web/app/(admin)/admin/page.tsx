import { AdminOverview } from '@/components/features/admin/admin-overview';
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
    <div className="flex flex-col gap-16 md:gap-20">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ · Admin · Dashboard</p>
        <h1 className="mt-4 display-lg text-foreground">Dashboard admin.</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-foreground-dim">
          {stats.currentSeason
            ? `Saison active · ${stats.currentSeason.name}`
            : 'Aucune saison active.'}
        </p>
      </header>

      <AdminOverview stats={stats} />

      <section>
        <p className="label-mono">§ Audit trail</p>
        <h2 className="mt-3 display-md text-foreground">Dernières actions.</h2>
        <div className="mt-8 border-t border-hairline">
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
                    <TableCell className="font-display text-foreground">{entry.action}</TableCell>
                    <TableCell>
                      {entry.entity}{' '}
                      <span className="label-mono text-foreground-muted">
                        #{entry.entityId.slice(0, 8)}
                      </span>
                    </TableCell>
                    <TableCell>{entry.user.name ?? entry.user.email}</TableCell>
                    <TableCell className="label-mono tabular-nums text-foreground-dim">
                      {formatDateTime(entry.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-6 text-sm text-foreground-dim">Aucun événement d&apos;audit.</p>
          )}
        </div>
      </section>
    </div>
  );
}
