import { AdminUsersManager } from '@/components/features/admin/admin-users-manager';

export default function AdminUsersPage() {
  return (
    <div className="flex flex-col gap-16 md:gap-20">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ · Admin · Utilisateurs</p>
        <h1 className="mt-4 display-lg text-foreground">Gestion utilisateurs.</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-foreground-dim">
          Attribuez les rôles et associez les chefs d&apos;équipe à leurs équipes. Plusieurs
          capitaines par équipe sont possibles.
        </p>
      </header>
      <AdminUsersManager />
    </div>
  );
}
