'use client';

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

export function PerformanceTrendsChart({ stats }: PerformanceTrendsChartProps) {
  if (stats.length < 2) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-4 text-sm text-text-secondary">
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
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="game"
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            tickLine={false}
            width={40}
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
            labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}
          />
          <Line type="monotone" dataKey="KDA" stroke="#7C3AED" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="CS" stroke="#fbbf24" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Kills" stroke="#f43f5e" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
          <Line type="monotone" dataKey="Assists" stroke="#34d399" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
