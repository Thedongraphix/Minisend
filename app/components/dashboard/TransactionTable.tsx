'use client';

import { UnifiedOrder } from '@/lib/types/dashboard';
import { TransactionRow } from './TransactionRow';
import { useState } from 'react';

interface TransactionTableProps {
  orders: UnifiedOrder[];
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function TransactionTable({ orders, loading, onLoadMore, hasMore }: TransactionTableProps) {
  const [refreshing, setRefreshing] = useState<string | null>(null);

  const handleRefresh = async (order: UnifiedOrder) => {
    setRefreshing(order.orderId);
    try {
      const url = order.provider === 'pretium'
        ? `/api/pretium/status/${order.orderId}`
        : `/api/paycrest/status/${order.orderId}`;
      const response = await fetch(url);
      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to refresh status:', error);
    } finally {
      setRefreshing(null);
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] overflow-hidden">
        <div className="p-6 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] p-16 text-center">
        <div className="w-12 h-12 rounded-full bg-white/[0.05] flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-[15px] text-white/40">No transactions found</p>
        <p className="text-[13px] text-white/25 mt-1">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] overflow-hidden">
      {/* Table Header */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left py-4 px-5 text-[11px] font-semibold text-white/40 uppercase tracking-wider">Transaction</th>
              <th className="text-left py-4 px-5 text-[11px] font-semibold text-white/40 uppercase tracking-wider">Amount</th>
              <th className="text-left py-4 px-5 text-[11px] font-semibold text-white/40 uppercase tracking-wider">Status</th>
              <th className="text-left py-4 px-5 text-[11px] font-semibold text-white/40 uppercase tracking-wider">Type</th>
              <th className="text-left py-4 px-5 text-[11px] font-semibold text-white/40 uppercase tracking-wider">Date</th>
              <th className="text-left py-4 px-5 text-[11px] font-semibold text-white/40 uppercase tracking-wider">Tx Hash</th>
              <th className="text-right py-4 px-5 text-[11px] font-semibold text-white/40 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {orders.map((order) => (
              <TransactionRow
                key={order.id}
                order={order}
                onRefresh={handleRefresh}
                refreshing={refreshing === order.orderId}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="p-4 border-t border-white/[0.06] flex justify-center">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="h-10 px-6 bg-white/[0.05] hover:bg-white/[0.08] text-[13px] font-medium text-white/70 rounded-lg transition-all disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
