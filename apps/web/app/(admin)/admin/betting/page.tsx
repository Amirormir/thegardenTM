import { AdminBettingManager } from '@/components/features/admin/admin-betting-manager';

export default function AdminBettingPage() {
  return (
    <div className="flex flex-col gap-16 md:gap-20">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ · Admin · Betting</p>
        <h1 className="mt-4 display-lg text-foreground">Moteur de paris.</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-foreground-dim">
          Seeding de présaison, réglages du moteur de cotes et supervision des paris.
        </p>
      </header>

      <AdminBettingManager />
    </div>
  );
}
