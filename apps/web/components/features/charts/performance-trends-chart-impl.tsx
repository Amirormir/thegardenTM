'use client';

import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface MatchStat {
  createdAt: Date | string;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
}

interface PerformanceTrendsChartProps {
  stats: MatchStat[];
}

const DEFAULT_THEME_COLORS = {
  accent: '#c9b8e8',
  win: '#7bb38a',
  loss: '#c87468',
  text: '#eee5d6',
  textMuted: '#8d8470',
  textDim: '#a8a08e',
  border: '#3a352b',
  bgElev: '#23211c',
};

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
      win: resolve('--win', DEFAULT_THEME_COLORS.win),
      loss: resolve('--loss', DEFAULT_THEME_COLORS.loss),
      text: resolve('--text', DEFAULT_THEME_COLORS.text),
      textMuted: resolve('--text-muted', DEFAULT_THEME_COLORS.textMuted),
      textDim: resolve('--text-dim', DEFAULT_THEME_COLORS.textDim),
      border: resolve('--border', DEFAULT_THEME_COLORS.border),
      bgElev: resolve('--bg-elev', DEFAULT_THEME_COLORS.bgElev),
    });
  }, []);

  return colors;
}

export function PerformanceTrendsChartImpl({ stats }: PerformanceTrendsChartProps) {
  const colors = useThemeColors();

  if (stats.length < 2) {
    return (
      <div className="border border-hairline bg-surface px-4 py-4 text-sm text-foreground-dim">
        Pas assez de donnees pour afficher les tendances.
      </div>
    );
  }

  const data = [...stats].reverse().map((stat, index) => {
    const kda = stat.deaths > 0 ? (stat.kills + stat.assists) / stat.deaths : stat.kills + stat.assists;
    return {
      game: `G${index + 1}`,
      KDA: Math.round(kda * 100) / 100,
      CS: stat.cs,
      Kills: stat.kills,
      Assists: stat.assists,
    };
  });

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="0" stroke={colors.border} vertical={false} />
          <XAxis
            dataKey="game"
            tick={{ fill: colors.textMuted, fontSize: 11 }}
            axisLine={{ stroke: colors.border }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: colors.textMuted, fontSize: 11 }}
            axisLine={{ stroke: colors.border }}
            tickLine={false}
            width={40}
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
            labelStyle={{ color: colors.textMuted, fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}
          />
          <Legend
            wrapperStyle={{
              fontSize: '11px',
              color: colors.textDim,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            }}
          />
          <Line type="monotone" dataKey="KDA" stroke={colors.accent} strokeWidth={1.75} dot={false} />
          <Line type="monotone" dataKey="CS" stroke={colors.textDim} strokeWidth={1.5} dot={false} />
          <Line type="monotone" dataKey="Kills" stroke={colors.win} strokeWidth={1.25} dot={false} strokeDasharray="4 4" />
          <Line type="monotone" dataKey="Assists" stroke={colors.loss} strokeWidth={1.25} dot={false} strokeDasharray="4 4" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
