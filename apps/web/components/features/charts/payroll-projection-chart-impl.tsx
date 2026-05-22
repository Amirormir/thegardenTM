'use client';

import { useEffect, useId, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface ProjectionPoint {
  boOffset: number;
  payroll: number;
  payrollWithPending: number;
}

interface PayrollProjectionChartProps {
  data: ProjectionPoint[];
  cap: number;
}

const DEFAULT_THEME_COLORS = {
  accent: '#c9b8e8',
  text: '#eee5d6',
  textMuted: '#8d8470',
  border: '#3a352b',
  bgElev: '#23211c',
  loss: '#e7754e',
};

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
      loss: resolve('--loss', DEFAULT_THEME_COLORS.loss),
    });
  }, []);

  return colors;
}

export function PayrollProjectionChartImpl({ data, cap }: PayrollProjectionChartProps) {
  const activeGradientId = useId();
  const pendingGradientId = useId();
  const colors = useThemeColors();

  const hasPending = data.some((point) => point.payrollWithPending > point.payroll);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={activeGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.accent} stopOpacity={0.32} />
              <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={pendingGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.accent} stopOpacity={0.12} />
              <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="0" stroke={colors.border} vertical={false} />
          <XAxis
            dataKey="boOffset"
            tickFormatter={(value: number) => `BO+${value}`}
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
          <ReferenceLine
            y={cap}
            stroke={colors.loss}
            strokeDasharray="3 3"
            strokeWidth={1}
            ifOverflow="extendDomain"
          />
          <Tooltip
            cursor={{ stroke: colors.accent, strokeWidth: 1 }}
            contentStyle={{
              backgroundColor: colors.bgElev,
              border: `1px solid ${colors.border}`,
              borderRadius: 0,
              color: colors.text,
              fontSize: '12px',
              padding: '8px 12px',
            }}
            formatter={(value: number, name: string) => [
              new Intl.NumberFormat('fr-FR').format(value),
              name === 'payroll' ? 'Actif' : 'Avec en attente',
            ]}
            labelFormatter={(value: number) => `BO+${value}`}
            labelStyle={{
              color: colors.textMuted,
              fontSize: '10px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          />
          {hasPending ? (
            <Area
              type="stepAfter"
              dataKey="payrollWithPending"
              stroke={colors.accent}
              strokeOpacity={0.45}
              strokeDasharray="3 3"
              strokeWidth={1}
              fill={`url(#${pendingGradientId})`}
              isAnimationActive={false}
            />
          ) : null}
          <Area
            type="stepAfter"
            dataKey="payroll"
            stroke={colors.accent}
            strokeWidth={1.5}
            fill={`url(#${activeGradientId})`}
            activeDot={{ r: 3, fill: colors.accent, stroke: colors.bgElev, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
