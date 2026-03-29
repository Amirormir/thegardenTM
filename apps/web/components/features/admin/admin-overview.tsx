import { StatCard } from '@/components/ui/stat-card';

interface AdminOverviewProps {
  stats: {
    players: number;
    teams: number;
    activeContracts: number;
    matches: number;
    auditLogs: number;
    currentSeason: { id: string; name: string } | null;
  };
}

export function AdminOverview({ stats }: AdminOverviewProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard
        label="Audit events"
        value={stats.auditLogs.toString()}
        icon="shield-alert"
        trend={{ direction: 'up', value: 'total' }}
      />
      <StatCard
        label="Players indexed"
        value={stats.players.toString()}
        icon="users"
        trend={{ direction: 'up', value: `${stats.teams} teams` }}
      />
      <StatCard
        label="Active contracts"
        value={stats.activeContracts.toString()}
        icon="wallet-cards"
        trend={{ direction: 'up', value: `${stats.matches} matchs` }}
      />
    </div>
  );
}
