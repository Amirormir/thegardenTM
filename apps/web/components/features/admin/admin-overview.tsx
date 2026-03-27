import { StatCard } from '@/components/ui/stat-card';

export function AdminOverview() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard
        label="Audit events"
        value="128"
        icon="shield-alert"
        trend={{ direction: 'up', value: '+14 today' }}
      />
      <StatCard
        label="Players indexed"
        value="20"
        icon="users"
        trend={{ direction: 'up', value: '+3 week' }}
      />
      <StatCard
        label="Active contracts"
        value="16"
        icon="wallet-cards"
        trend={{ direction: 'down', value: '-1 expired' }}
      />
    </div>
  );
}
