'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface RoleBudgetEntry {
  role: string;
  value: number;
}

interface BudgetPieChartProps {
  roleBudget: RoleBudgetEntry[];
}

const ROLE_COLORS: Record<string, string> = {
  TOP: '#38bdf8',
  JUNGLE: '#34d399',
  MID: '#a78bfa',
  ADC: '#fbbf24',
  SUPPORT: '#e879f9',
};

function getColor(role: string) {
  return ROLE_COLORS[role] ?? '#94a3b8';
}

export function BudgetPieChart({ roleBudget }: BudgetPieChartProps) {
  const filtered = roleBudget.filter((entry) => entry.value > 0);

  if (filtered.length === 0) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-4 text-sm text-text-secondary">
        Aucune donnee de budget par role.
      </div>
    );
  }

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={filtered}
            dataKey="value"
            nameKey="role"
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={70}
            strokeWidth={0}
            labelLine={false}
          >
            {filtered.map((entry) => (
              <Cell key={entry.role} fill={getColor(entry.role)} fillOpacity={0.7} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15, 14, 21, 0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              color: '#fff',
              fontSize: '13px',
              backdropFilter: 'blur(12px)',
            }}
            formatter={(value: number) => [new Intl.NumberFormat('fr-FR').format(value), 'Salaire']}
            labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
