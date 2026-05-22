'use client';

import dynamic from 'next/dynamic';

export const PayrollProjectionChart = dynamic(
  () =>
    import('./payroll-projection-chart-impl').then(
      (mod) => mod.PayrollProjectionChartImpl,
    ),
  {
    ssr: false,
    loading: () => <div className="h-64 w-full" aria-hidden />,
  },
);
