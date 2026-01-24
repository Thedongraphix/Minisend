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

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'pending':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'processing':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'cancelled':
        return 'bg-white/5 text-white/40 border-white/10';
      default:
        return 'bg-white/5 text-white/40 border-white/10';
    }
  };

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case 'MOBILE': return 'Mobile';
      case 'BUY_GOODS': return 'Buy Goods';
      case 'PAYBILL': return 'Paybill';
      case 'BANK_TRANSFER': return 'Bank';
      default: return type;
    }
  };

  return (
    <>
      <tr className="group hover:bg-white/[0.02] transition-colors">
        {/* Transaction Code */}
        <td className="py-4 px-5">
          <div>
            <p className="font-mono text-[13px] text-white/90 tracking-tight">
              {order.transaction_code}
            </p>
          </div>
        </td>

        {/* Amount */}
        <td className="py-4 px-5">
          <div>
            <p className="text-[14px] font-medium text-white">${order.amount_in_usdc}</p>
            <p className="text-[12px] text-white/40 mt-0.5">
              {order.amount_in_local?.toLocaleString()} {order.local_currency}
            </p>
          </div>
        </td>

        {/* Status */}
        <td className="py-4 px-5">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide border ${getStatusStyle(order.status)}`}>
            {order.status}
          </span>
        </td>

        {/* Payment Type */}
        <td className="py-4 px-5">
          <span className="text-[13px] text-white/60">
            {getPaymentTypeLabel(order.payment_type)}
          </span>
        </td>

        {/* Created At */}
        <td className="py-4 px-5">
          <span className="text-[13px] text-white/50">
            {formatEATDate(order.created_at, true)}
          </span>
        </td>

        {/* Tx Hash */}
        <td className="py-4 px-5">
          {order.transaction_hash ? (
            <a
              href={getBaseScanTxUrl(order.transaction_hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[13px] text-blue-400 hover:text-blue-300 font-mono transition-colors"
            >
              {truncateHash(order.transaction_hash, 6, 4)}
              <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ) : (
            <span className="text-[12px] text-white/20">-</span>
          )}
        </td>

        {/* Actions */}
        <td className="py-4 px-5">
          <div className="flex gap-1 justify-end">
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.05] transition-colors"
              aria-label="Toggle details"
            >
              <svg
                className={`w-4 h-4 text-white/40 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
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
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.05] transition-colors disabled:opacity-30"
              aria-label="Refresh status"
            >
              <svg
                className={`w-4 h-4 text-white/40 ${refreshing ? 'animate-spin' : ''}`}
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

      {/* Expanded Details */}
      {expanded && (
        <tr>
          <td colSpan={7} className="bg-white/[0.01] border-t border-white/[0.04]">
            <div className="p-5">
              <TransactionDetails order={order} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
