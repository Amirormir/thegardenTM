'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface MarketValueEntry {
  changedAt: Date | string;
  previousValue: number;
  newValue: number;
}

interface MarketValueChartProps {
  history: MarketValueEntry[];
}

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

function formatValue(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
}

export function MarketValueChart({ history }: MarketValueChartProps) {
  if (history.length < 2) {
    return (
      <div className="rounded-2xl border border-white/[0.05] bg-white/[0.035] px-4 py-4 text-sm text-text-secondary">
        Pas assez de donnees pour afficher le graphique.
      </div>
    );
  }

  const data = [...history]
    .reverse()
    .map((entry) => ({
      date: formatDate(entry.changedAt),
      value: entry.newValue,
    }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="marketValueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="date"
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatValue}
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            tickLine={false}
            width={50}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15, 14, 21, 0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              color: '#fff',
              fontSize: '13px',
              backdropFilter: 'blur(12px)',
            }}
            formatter={(value: number) => [new Intl.NumberFormat('fr-FR').format(value), 'Valeur']}
            labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#7C3AED"
            strokeWidth={2}
            fill="url(#marketValueGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
