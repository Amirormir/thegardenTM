import { AdminContractsManager } from '@/components/features/admin/admin-contracts-manager';

export default function AdminContractsPage() {
  return (
    <div className="flex flex-col gap-16 md:gap-20">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ · Admin · Contrats</p>
        <h1 className="mt-4 display-lg text-foreground">Validation contrats.</h1>
      </header>
      <AdminContractsManager />
    </div>
  );
}
