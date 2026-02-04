'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UnifiedOrder, UnifiedDashboardStats } from '@/lib/types/dashboard';
import { DashboardMetrics } from './DashboardMetrics';
import { TransactionFilters } from './TransactionFilters';
import { TransactionTable } from './TransactionTable';
import { ExportButton } from './ExportButton';

interface OrdersResponse {
  orders: UnifiedOrder[];
  total: number;
  page: number;
  hasMore: boolean;
}

const DEFAULT_STATS: UnifiedDashboardStats = {
  totalOrders: 0,
  successRate: 0,
  failedOrders: 0,
  pendingOrders: 0,
  totalUSDCVolume: 0,
  uniqueWallets: 0,
  newUsers: 0,
  totalRevenue: 0,
  stuckOrders: 0,
  avgCompletionTime: 0,
  providers: {
    pretium: { total: 0, completed: 0, failed: 0, volume: 0, successRate: 0 },
    paycrest: { total: 0, completed: 0, failed: 0, volume: 0, successRate: 0 },
  },
  currencies: {},
  monthlyTrends: [],
};

function getDateRangeParams(dateRange: string): { start_date?: string; end_date?: string } {
  if (dateRange === 'all') return {};
  const now = new Date();
  let startDate: Date;

  if (dateRange === 'today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (dateRange === '7d') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (dateRange === '30d') {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else {
    return {};
  }

  return { start_date: startDate.toISOString() };
}

export function PretiumDashboard() {
  const [filters, setFilters] = useState({
    search: '',
    status: [] as string[],
    paymentType: [] as string[],
    provider: 'all',
    currency: [] as string[],
    dateRange: '30d',
  });
  const [page, setPage] = useState(1);

  // Fetch unified stats
  const { data: stats, isLoading: statsLoading } = useQuery<UnifiedDashboardStats>({
    queryKey: ['unified-stats', filters.dateRange],
    queryFn: async () => {
      const dateParams = getDateRangeParams(filters.dateRange);
      const params = new URLSearchParams();
      if (dateParams.start_date) params.set('start_date', dateParams.start_date);
      if (dateParams.end_date) params.set('end_date', dateParams.end_date);

      const url = params.toString()
        ? `/api/pretium/dashboard/stats?${params}`
        : '/api/pretium/dashboard/stats';

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    refetchInterval: 30000,
  });

  // Fetch unified orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery<OrdersResponse>({
    queryKey: ['unified-orders', filters, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });

      if (filters.search) params.set('search', filters.search);
      if (filters.status.length > 0) params.set('status', filters.status.join(','));
      if (filters.paymentType.length > 0) params.set('payment_type', filters.paymentType.join(','));
      if (filters.provider && filters.provider !== 'all') params.set('provider', filters.provider);
      if (filters.currency.length > 0) params.set('currency', filters.currency.join(','));

      if (filters.dateRange !== 'all') {
        const dateParams = getDateRangeParams(filters.dateRange);
        if (dateParams.start_date) params.set('start_date', dateParams.start_date);
      }

      const response = await fetch(`/api/pretium/dashboard/orders?${params}`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
  });

  useEffect(() => {
    setPage(1);
  }, [filters]);

  return (
    <div className="min-h-screen bg-black">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <span className="text-[17px] font-semibold text-white">Minisend Dashboard</span>
            </div>
            <div className="flex items-center gap-3">
              <ExportButton orders={ordersData?.orders || []} />
              <button
                onClick={async () => {
                  await fetch('/api/auth/dashboard/logout', { method: 'POST' });
                  window.location.href = '/dashboard/pretium/login';
                }}
                className="px-4 py-2 text-[15px] font-medium text-white/60 hover:text-white transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <p className="text-[15px] text-white/50 mt-1">Unified analytics across Pretium and Paycrest</p>
        </div>

        {/* Metrics Grid */}
        <DashboardMetrics
          stats={stats || DEFAULT_STATS}
          loading={statsLoading}
        />

        {/* Filters Section */}
        <div className="mt-8">
          <TransactionFilters onFiltersChange={setFilters} />
        </div>

        {/* Transactions Section */}
        <div className="mt-6">
          <TransactionTable
            orders={ordersData?.orders || []}
            loading={ordersLoading}
            hasMore={ordersData?.hasMore}
            onLoadMore={() => setPage((p) => p + 1)}
          />
        </div>

        {/* Footer Stats */}
        {ordersData && (
          <div className="mt-6 text-center">
            <span className="text-[13px] text-white/40">
              Showing {ordersData.orders.length} of {ordersData.total} transactions
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
