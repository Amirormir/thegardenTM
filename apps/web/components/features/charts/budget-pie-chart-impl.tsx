'use client';

import { useEffect, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface RoleBudgetEntry {
  role: string;
  value: number;
}

interface BudgetPieChartProps {
  roleBudget: RoleBudgetEntry[];
}

const ROLE_VAR: Record<string, string> = {
  TOP: '--role-top',
  JUNGLE: '--role-jg',
  MID: '--role-mid',
  ADC: '--role-adc',
  SUPPORT: '--role-sup',
};

function useThemeColors() {
  const [colors, setColors] = useState({
    TOP: '#94a3b8',
    JUNGLE: '#94a3b8',
    MID: '#94a3b8',
    ADC: '#94a3b8',
    SUPPORT: '#94a3b8',
    border: '#1a1a1a',
    surface: '#0a0a0a',
    text: '#fafafa',
    textMuted: '#737373',
  });

  useEffect(() => {
    const root = document.documentElement;
    const s = getComputedStyle(root);
    setColors({
      TOP: s.getPropertyValue(ROLE_VAR.TOP!).trim() || '#94a3b8',
      JUNGLE: s.getPropertyValue(ROLE_VAR.JUNGLE!).trim() || '#94a3b8',
      MID: s.getPropertyValue(ROLE_VAR.MID!).trim() || '#94a3b8',
      ADC: s.getPropertyValue(ROLE_VAR.ADC!).trim() || '#94a3b8',
      SUPPORT: s.getPropertyValue(ROLE_VAR.SUPPORT!).trim() || '#94a3b8',
      border: s.getPropertyValue('--border').trim() || '#1a1a1a',
      surface: s.getPropertyValue('--bg-elev').trim() || '#0a0a0a',
      text: s.getPropertyValue('--text').trim() || '#fafafa',
      textMuted: s.getPropertyValue('--text-muted').trim() || '#737373',
    });
  }, []);

  return colors;
}

export function BudgetPieChartImpl({ roleBudget }: BudgetPieChartProps) {
  const colors = useThemeColors();
  const filtered = roleBudget.filter((entry) => entry.value > 0);

  if (filtered.length === 0) {
    return (
      <div className="border border-hairline bg-surface px-4 py-4 text-sm text-foreground-dim">
        Aucune donnée de budget par rôle.
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
              <Cell
                key={entry.role}
                fill={colors[entry.role as keyof typeof colors] ?? colors.text}
                fillOpacity={0.85}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 0,
              color: colors.text,
              fontSize: '12px',
              fontFamily: 'var(--font-geist-mono)',
            }}
            formatter={(value: number) => [new Intl.NumberFormat('fr-FR').format(value), 'Salaire']}
            labelStyle={{ color: colors.textMuted }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
