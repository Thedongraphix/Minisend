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
        'KES Amount',
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
      className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      {exporting ? 'Exporting...' : 'Export CSV'}
    </button>
  );
}
