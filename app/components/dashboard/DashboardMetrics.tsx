'use client';

import { MetricCard } from './MetricCard';

interface DashboardMetricsProps {
  stats: {
    totalOrders: number;
    successRate: number;
    failedOrders: number;
    totalUSDCVolume: number;
  };
  loading?: boolean;
}

export function DashboardMetrics({ stats, loading }: DashboardMetricsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="border border-gray-800/50 rounded-2xl p-6 bg-[#111]"
          >
            <div className="h-4 w-20 bg-gray-800 rounded animate-pulse mb-4"></div>
            <div className="h-8 w-32 bg-gray-800 rounded animate-pulse mb-2"></div>
            <div className="h-3 w-24 bg-gray-800 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
      <MetricCard
        title="Total Orders"
        value={stats.totalOrders.toLocaleString()}
        subtitle="All-time"
      />

      <MetricCard
        title="Success Rate"
        value={`${stats.successRate}%`}
        subtitle="Completed orders"
      />

      <MetricCard
        title="Failed Orders"
        value={stats.failedOrders}
        subtitle="Requires attention"
      />

      <MetricCard
        title="Total Volume"
        value={`$${stats.totalUSDCVolume.toLocaleString()}`}
        subtitle="USDC processed"
      />
    </div>
  );
}
