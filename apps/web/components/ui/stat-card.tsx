import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Coins,
  Crosshair,
  Shield,
  ShieldAlert,
  Swords,
  Trophy,
  Users,
  WalletCards,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const iconMap = {
  'bar-chart': BarChart3,
  coins: Coins,
  crosshair: Crosshair,
  shield: Shield,
  'shield-alert': ShieldAlert,
  swords: Swords,
  trophy: Trophy,
  users: Users,
  'wallet-cards': WalletCards,
} as const;

export type StatCardIcon = keyof typeof iconMap;

export interface StatCardProps {
  label: string;
  value: string;
  icon: StatCardIcon;
  trend?: {
    direction: 'up' | 'down';
    value: string;
  };
}

export function StatCard({ label, value, icon: Icon, trend }: StatCardProps) {
  const ResolvedIcon = iconMap[Icon];

  return (
    <div className="border border-hairline bg-surface p-6">
      <div className="flex items-start justify-between gap-4">
        <p className="label-mono">{label}</p>
        <ResolvedIcon className="h-4 w-4 text-foreground-muted" />
      </div>
      <p className="mt-4 display-kpi text-foreground tabular-nums">{value}</p>
      {trend ? (
        <div
          className={cn(
            'mt-3 inline-flex items-center gap-1 label-mono',
            trend.direction === 'up'
              ? 'text-[color:var(--win)]'
              : 'text-[color:var(--loss)]',
          )}
        >
          {trend.direction === 'up' ? (
            <ArrowUpRight className="h-3 w-3" />
          ) : (
            <ArrowDownRight className="h-3 w-3" />
          )}
          {trend.value}
        </div>
      ) : null}
    </div>
  );
}
