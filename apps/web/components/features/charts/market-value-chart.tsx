'use client';

import dynamic from 'next/dynamic';

export const MarketValueChart = dynamic(
  () => import('./market-value-chart-impl').then((mod) => mod.MarketValueChartImpl),
  {
    ssr: false,
    loading: () => <div className="h-64 w-full" aria-hidden />,
  },
);
