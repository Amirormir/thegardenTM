'use client';

import dynamic from 'next/dynamic';

export const BudgetPieChart = dynamic(
  () => import('./budget-pie-chart-impl').then((mod) => mod.BudgetPieChartImpl),
  {
    ssr: false,
    loading: () => <div className="h-52 w-full" aria-hidden />,
  },
);
