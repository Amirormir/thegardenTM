'use client';

import dynamic from 'next/dynamic';

export const PerformanceTrendsChart = dynamic(
  () => import('./performance-trends-chart-impl').then((mod) => mod.PerformanceTrendsChartImpl),
  {
    ssr: false,
    loading: () => <div className="h-64 w-full" aria-hidden />,
  },
);
