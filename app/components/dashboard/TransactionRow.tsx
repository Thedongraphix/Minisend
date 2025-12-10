'use client';

import { useState } from 'react';
import { PretiumOrder } from '@/lib/supabase/config';
import { TransactionDetails } from './TransactionDetails';
import { formatEATDate, truncateHash, getBaseScanTxUrl } from '@/lib/basescan-utils';

interface TransactionRowProps {
  order: PretiumOrder;
  onRefresh: (transactionCode: string) => Promise<void>;
  refreshing: boolean;
}

export function TransactionRow({ order, onRefresh, refreshing }: TransactionRowProps) {
  const [expanded, setExpanded] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'processing':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'cancelled':
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <>
      <tr className="border-b border-gray-800/30 hover:bg-[#0a0a0a] transition-colors">
        {/* Transaction Code */}
        <td className="py-4 px-6">
          <div>
            <p className="font-mono text-sm text-white break-all">
              {order.transaction_code}
            </p>
            <p className="text-xs text-gray-500">Transaction ID</p>
          </div>
        </td>

        {/* Amount */}
        <td className="py-4 px-6">
          <div>
            <p className="text-white font-medium">${order.amount_in_usdc} USDC</p>
            <p className="text-xs text-gray-500">→ {order.amount_in_local?.toLocaleString()} KES</p>
          </div>
        </td>

        {/* Status (MIDDLE) */}
        <td className="py-4 px-6">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(order.status)}`}>
            {order.status}
          </span>
        </td>

        {/* Payment Type */}
        <td className="py-4 px-6">
          <div>
            <p className="text-sm text-gray-300">{order.payment_type}</p>
            <p className="text-xs text-gray-500">Payment method</p>
          </div>
        </td>

        {/* Created At */}
        <td className="py-4 px-6">
          <div>
            <p className="text-sm text-gray-300">
              {formatEATDate(order.created_at, true)}
            </p>
            <p className="text-xs text-gray-500">Created</p>
          </div>
        </td>

        {/* Tx Hash */}
        <td className="py-4 px-6">
          {order.transaction_hash ? (
            <a
              href={getBaseScanTxUrl(order.transaction_hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              <span>{truncateHash(order.transaction_hash, 6, 4)}</span>
              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
              </svg>
            </a>
          ) : (
            <span className="text-xs text-gray-500">No TX</span>
          )}
        </td>

        {/* Actions */}
        <td className="py-4 px-6">
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 hover:bg-[#111] rounded-lg transition-colors"
              aria-label="Toggle details"
            >
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              onClick={() => onRefresh(order.transaction_code)}
              disabled={refreshing}
              className="p-2 hover:bg-[#111] rounded-lg transition-colors disabled:opacity-50"
              aria-label="Refresh status"
            >
              <svg
                className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded Details Row */}
      {expanded && (
        <tr>
          <td colSpan={7} className="bg-[#0a0a0a] border-b border-gray-800/30">
            <div className="px-6 py-4">
              <TransactionDetails order={order} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
