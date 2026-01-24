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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white/[0.03] rounded-2xl p-5 border border-white/[0.06]"
          >
            <div className="h-3 w-16 bg-white/10 rounded-full animate-pulse mb-3"></div>
            <div className="h-8 w-24 bg-white/10 rounded-lg animate-pulse mb-2"></div>
            <div className="h-3 w-20 bg-white/5 rounded-full animate-pulse"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Total Orders"
        value={stats.totalOrders.toLocaleString()}
        subtitle="All time"
      />

      <MetricCard
        title="Success Rate"
        value={`${stats.successRate}%`}
        subtitle="Completed"
      />

      <MetricCard
        title="Failed"
        value={stats.failedOrders}
        subtitle="Needs attention"
      />

      <MetricCard
        title="Volume"
        value={`$${stats.totalUSDCVolume.toLocaleString()}`}
        subtitle="USDC processed"
      />
    </div>
  );
}
