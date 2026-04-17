import { AdminContractsManager } from '@/components/features/admin/admin-contracts-manager';

export default function AdminContractsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-kicker">Admin zone</p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">Validation contrats</h1>
      </div>
      <AdminContractsManager />
    </div>
  );
}
