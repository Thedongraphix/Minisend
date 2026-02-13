'use client';

import { MetricCard } from './MetricCard';
import { UnifiedDashboardStats } from '@/lib/types/dashboard';

interface DashboardMetricsProps {
  stats: UnifiedDashboardStats;
  loading?: boolean;
  periodLabel: string;
}

export function DashboardMetrics({ stats, loading, periodLabel }: DashboardMetricsProps) {
  if (loading) {
    return (
      <div className="space-y-6">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white/[0.03] rounded-2xl p-5 border border-white/[0.06] h-40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const currencyEntries = Object.entries(stats.currencies || {}).filter(
    ([, data]) => data.orders > 0
  );

  return (
    <div className="space-y-6">
      {/* Row 1: Combined Top-Level Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Orders"
          value={stats.totalOrders.toLocaleString()}
          subtitle={periodLabel}
        />
        <MetricCard
          title="Success Rate"
          value={`${stats.successRate}%`}
          subtitle={`Completed \u00B7 ${periodLabel}`}
        />
        <MetricCard
          title="Volume"
          value={`$${stats.totalUSDCVolume.toLocaleString()}`}
          subtitle={`USDC \u00B7 ${periodLabel}`}
        />
        <MetricCard
          title="Unique Wallets"
          value={stats.uniqueWallets.toLocaleString()}
          subtitle={periodLabel}
        />
      </div>

      {/* Row 2: Provider Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pretium Card */}
        <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl p-5 border border-white/[0.06]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Pretium
              </span>
              <span className="text-[13px] text-white/40">KES / UGX</span>
            </div>
            <span className="text-[11px] text-white/30">{periodLabel}</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[12px] text-white/40 mb-1">Orders</p>
              <p className="text-[20px] font-semibold text-white">{stats.providers.pretium.total}</p>
            </div>
            <div>
              <p className="text-[12px] text-white/40 mb-1">Volume</p>
              <p className="text-[20px] font-semibold text-white">${stats.providers.pretium.volume.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[12px] text-white/40 mb-1">Success</p>
              <p className="text-[20px] font-semibold text-emerald-400">{stats.providers.pretium.successRate}%</p>
            </div>
          </div>
        </div>

        {/* Paycrest Card */}
        <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl p-5 border border-white/[0.06]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                Paycrest
              </span>
              <span className="text-[13px] text-white/40">NGN</span>
            </div>
            <span className="text-[11px] text-white/30">{periodLabel}</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[12px] text-white/40 mb-1">Orders</p>
              <p className="text-[20px] font-semibold text-white">{stats.providers.paycrest.total}</p>
            </div>
            <div>
              <p className="text-[12px] text-white/40 mb-1">Volume</p>
              <p className="text-[20px] font-semibold text-white">${stats.providers.paycrest.volume.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[12px] text-white/40 mb-1">Success</p>
              <p className="text-[20px] font-semibold text-emerald-400">{stats.providers.paycrest.successRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Currency Breakdown + Extra Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {currencyEntries.map(([currency, data]) => (
          <div
            key={currency}
            className="bg-white/[0.03] backdrop-blur-sm rounded-2xl p-4 border border-white/[0.06]"
          >
            <p className="text-[12px] font-semibold text-white/40 uppercase tracking-wide mb-2">{currency}</p>
            <p className="text-[18px] font-semibold text-white">{data.orders} txns</p>
            <p className="text-[12px] text-white/40 mt-1">${data.volume.toLocaleString(undefined, { maximumFractionDigits: 0 })} USDC</p>
          </div>
        ))}
        <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl p-4 border border-white/[0.06]">
          <p className="text-[12px] font-semibold text-white/40 uppercase tracking-wide mb-2">New Users</p>
          <p className="text-[18px] font-semibold text-white">{stats.newUsers}</p>
          <p className="text-[12px] text-white/40 mt-1">Registered</p>
        </div>
        <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl p-4 border border-white/[0.06]">
          <p className="text-[12px] font-semibold text-white/40 uppercase tracking-wide mb-2">Failed</p>
          <p className="text-[18px] font-semibold text-red-400">{stats.failedOrders}</p>
          <p className="text-[12px] text-white/40 mt-1">Needs attention</p>
        </div>
      </div>

      {/* Monthly Trends */}
      {stats.monthlyTrends.length > 0 && (
        <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl p-5 border border-white/[0.06]">
          <h3 className="text-[13px] font-semibold text-white/50 uppercase tracking-wide mb-4">Monthly Volume</h3>
          <div className="space-y-3">
            {stats.monthlyTrends.slice(-6).map((trend) => {
              const maxVolume = Math.max(...stats.monthlyTrends.slice(-6).map(t => t.totalVolume));
              const pretiumWidth = maxVolume > 0 ? (trend.pretiumVolume / maxVolume) * 100 : 0;
              const paycrestWidth = maxVolume > 0 ? (trend.paycrestVolume / maxVolume) * 100 : 0;

              return (
                <div key={trend.month} className="flex items-center gap-4">
                  <span className="text-[13px] text-white/50 w-20 shrink-0">{trend.month}</span>
                  <div className="flex-1 flex gap-0.5 h-6 items-center">
                    {pretiumWidth > 0 && (
                      <div
                        className="h-full bg-purple-500/40 rounded-l"
                        style={{ width: `${pretiumWidth}%` }}
                      />
                    )}
                    {paycrestWidth > 0 && (
                      <div
                        className="h-full bg-teal-500/40 rounded-r"
                        style={{ width: `${paycrestWidth}%` }}
                      />
                    )}
                  </div>
                  <div className="text-right shrink-0 w-36">
                    <span className="text-[13px] text-white/80 font-medium">${trend.totalVolume.toLocaleString()}</span>
                    <span className="text-[11px] text-white/30 ml-2">{trend.orderCount} txns</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.04]">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-purple-500/40 rounded-sm" />
              <span className="text-[11px] text-white/40">Pretium</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-teal-500/40 rounded-sm" />
              <span className="text-[11px] text-white/40">Paycrest</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
