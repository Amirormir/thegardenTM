'use client';

import { useEffect, useId, useState } from 'react';
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

const DEFAULT_THEME_COLORS = {
  accent: '#c9b8e8',
  text: '#eee5d6',
  textMuted: '#8d8470',
  border: '#3a352b',
  bgElev: '#23211c',
};

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

function useThemeColors() {
  const [colors, setColors] = useState(DEFAULT_THEME_COLORS);

  useEffect(() => {
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    const resolve = (token: string, fallback: string) => {
      const raw = styles.getPropertyValue(token).trim();
      return raw ? raw : fallback;
    };
    setColors({
      accent: resolve('--accent', DEFAULT_THEME_COLORS.accent),
      text: resolve('--text', DEFAULT_THEME_COLORS.text),
      textMuted: resolve('--text-muted', DEFAULT_THEME_COLORS.textMuted),
      border: resolve('--border', DEFAULT_THEME_COLORS.border),
      bgElev: resolve('--bg-elev', DEFAULT_THEME_COLORS.bgElev),
    });
  }, []);

  return colors;
}

export function MarketValueChartImpl({ history }: MarketValueChartProps) {
  const gradientId = useId();
  const colors = useThemeColors();

  if (history.length < 2) {
    return (
      <div className="border border-hairline bg-surface px-4 py-4 text-sm text-foreground-dim">
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
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.accent} stopOpacity={0.32} />
              <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="0" stroke={colors.border} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: colors.textMuted, fontSize: 11 }}
            axisLine={{ stroke: colors.border }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatValue}
            tick={{ fill: colors.textMuted, fontSize: 11 }}
            axisLine={{ stroke: colors.border }}
            tickLine={false}
            width={50}
          />
          <Tooltip
            cursor={{ stroke: colors.accent, strokeWidth: 1, strokeDasharray: '0' }}
            contentStyle={{
              backgroundColor: colors.bgElev,
              border: `1px solid ${colors.border}`,
              borderRadius: 0,
              color: colors.text,
              fontSize: '12px',
              padding: '8px 12px',
            }}
            formatter={(value: number) => [new Intl.NumberFormat('fr-FR').format(value), 'Valeur']}
            labelStyle={{ color: colors.textMuted, fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={colors.accent}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            activeDot={{ r: 3, fill: colors.accent, stroke: colors.bgElev, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
