'use client';

import { PretiumOrder } from '@/lib/supabase/config';
import { TransactionRow } from './TransactionRow';
import { useState } from 'react';

interface TransactionTableProps {
  orders: PretiumOrder[];
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function TransactionTable({ orders, loading, onLoadMore, hasMore }: TransactionTableProps) {
  const [refreshing, setRefreshing] = useState<string | null>(null);

  const handleRefresh = async (transactionCode: string) => {
    setRefreshing(transactionCode);
    try {
      const response = await fetch(`/api/pretium/status/${transactionCode}`);
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
      <div className="border border-gray-800/50 rounded-2xl overflow-hidden bg-[#111]">
        <div className="space-y-4 p-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-800/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="border border-gray-800/50 rounded-2xl p-12 bg-[#111] text-center">
        <p className="text-gray-400">No orders found</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-800/50 rounded-2xl overflow-hidden bg-[#111]">
      {/* Desktop Table View */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800/50">
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Transaction</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Amount</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Status</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Type</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Created</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Tx Hash</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <TransactionRow
                key={order.id}
                order={order}
                onRefresh={handleRefresh}
                refreshing={refreshing === order.transaction_code}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="p-4 border-t border-gray-800/50 text-center">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="px-6 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm font-medium"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
