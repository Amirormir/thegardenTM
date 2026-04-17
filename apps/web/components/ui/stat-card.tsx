'use client';

import { motion, useReducedMotion } from 'framer-motion';
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
import { Card } from './card';
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
  const prefersReducedMotion = useReducedMotion();
  const ResolvedIcon = iconMap[Icon];

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
      animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <Card className="h-full">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.06em] text-text-secondary">{label}</p>
            <p className="mt-3 font-display text-2xl font-bold tracking-tight text-white tabular-nums">{value}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-3 text-accent-glow">
            <ResolvedIcon className="h-5 w-5" />
          </div>
        </div>
        {trend ? (
          <div
            className={cn(
              'mt-4 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.06em]',
              trend.direction === 'up'
                ? 'bg-emerald-500/10 text-emerald-200'
                : 'bg-rose-500/10 text-rose-200',
            )}
          >
            {trend.direction === 'up' ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {trend.value}
          </div>
        ) : null}
      </Card>
    </motion.div>
  );
}
