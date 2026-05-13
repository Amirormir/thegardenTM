import { AdminTeamsManager } from '@/components/features/admin/admin-teams-manager';

export default function AdminTeamsPage() {
  return (
    <div className="flex flex-col gap-16 md:gap-20">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ · Admin · Équipes</p>
        <h1 className="mt-4 display-lg text-foreground">Gestion équipes.</h1>
      </header>
      <AdminTeamsManager />
    </div>
  );
}
