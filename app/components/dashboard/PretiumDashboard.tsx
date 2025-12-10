'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PretiumOrder } from '@/lib/supabase/config';
import { DashboardMetrics } from './DashboardMetrics';
import { TransactionFilters } from './TransactionFilters';
import { TransactionTable } from './TransactionTable';
import { ExportButton } from './ExportButton';

interface DashboardStats {
  totalOrders: number;
  successRate: number;
  failedOrders: number;
  totalUSDCVolume: number;
}

interface OrdersResponse {
  orders: PretiumOrder[];
  total: number;
  page: number;
  hasMore: boolean;
}

export function PretiumDashboard() {
  const [filters, setFilters] = useState({
    search: '',
    status: [] as string[],
    paymentType: [] as string[],
    dateRange: '30d',
  });
  const [page, setPage] = useState(1);

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['pretium-stats'],
    queryFn: async () => {
      const response = await fetch('/api/pretium/dashboard/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery<OrdersResponse>({
    queryKey: ['pretium-orders', filters, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });

      if (filters.search) params.set('search', filters.search);
      if (filters.status.length > 0) params.set('status', filters.status.join(','));
      if (filters.paymentType.length > 0) params.set('payment_type', filters.paymentType.join(','));

      // Date range handling
      if (filters.dateRange !== 'all') {
        const now = new Date();
        let startDate: Date;

        if (filters.dateRange === 'today') {
          startDate = new Date(now.setHours(0, 0, 0, 0));
        } else if (filters.dateRange === '7d') {
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (filters.dateRange === '30d') {
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else {
          startDate = new Date(0);
        }

        params.set('start_date', startDate.toISOString());
      }

      const response = await fetch(`/api/pretium/dashboard/orders?${params}`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
  });

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-medium text-white">Pretium Orders Dashboard</h1>
            <p className="text-sm text-gray-400">Monitor and track all Pretium transactions</p>
          </div>
          <ExportButton orders={ordersData?.orders || []} />
        </div>

        {/* Metrics */}
        <DashboardMetrics
          stats={stats || { totalOrders: 0, successRate: 0, failedOrders: 0, totalUSDCVolume: 0 }}
          loading={statsLoading}
        />

        {/* Filters */}
        <TransactionFilters onFiltersChange={setFilters} />

        {/* Orders Table */}
        <TransactionTable
          orders={ordersData?.orders || []}
          loading={ordersLoading}
          hasMore={ordersData?.hasMore}
          onLoadMore={() => setPage((p) => p + 1)}
        />

        {/* Footer */}
        {ordersData && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Showing {ordersData.orders.length} of {ordersData.total} orders
          </div>
        )}
      </div>
    </div>
  );
}
