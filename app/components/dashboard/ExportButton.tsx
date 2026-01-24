'use client';

import { PretiumOrder } from '@/lib/supabase/config';
import { useState } from 'react';

interface ExportButtonProps {
  orders: PretiumOrder[];
}

export function ExportButton({ orders }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const exportToCSV = () => {
    setExporting(true);
    try {
      // CSV Headers
      const headers = [
        'Transaction Code',
        'Created At',
        'Status',
        'Payment Type',
        'USDC Amount',
        'Local Amount',
        'Currency',
        'Exchange Rate',
        'Fee',
        'Destination',
        'Account Name',
        'Receipt Number',
        'Wallet Address',
        'Blockchain Hash',
        'Completed At',
      ];

      // CSV Rows
      const rows = orders.map((order) => {
        const destination =
          order.payment_type === 'MOBILE'
            ? order.phone_number
            : order.payment_type === 'BUY_GOODS'
            ? `Till ${order.till_number}`
            : `Paybill ${order.paybill_number} (${order.paybill_account})`;

        return [
          order.transaction_code,
          order.created_at,
          order.status,
          order.payment_type,
          order.amount_in_usdc,
          order.amount_in_local,
          order.local_currency,
          order.exchange_rate,
          order.sender_fee,
          destination,
          order.account_name || '',
          order.receipt_number || '',
          order.wallet_address,
          order.transaction_hash || '',
          order.completed_at || '',
        ];
      });

      // Build CSV
      const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pretium-orders-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={exportToCSV}
      disabled={exporting || orders.length === 0}
      className="h-9 px-4 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.06] text-[13px] font-medium text-white/70 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
        />
      </svg>
      {exporting ? 'Exporting...' : 'Export'}
    </button>
  );
}
