import { AdminMatchesManager } from '@/components/features/admin/admin-matches-manager';

export default function AdminMatchesPage() {
  return (
    <div className="flex flex-col gap-16 md:gap-20">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ · Admin · Matchs</p>
        <h1 className="mt-4 display-lg text-foreground">Gestion matchs.</h1>
      </header>
      <AdminMatchesManager />
    </div>
  );
}
