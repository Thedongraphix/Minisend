'use client';

import { PretiumOrder } from '@/lib/supabase/config';
import { getBaseScanTxUrl, getBaseScanAddressUrl, truncateHash, copyToClipboard, formatEATDate, getTimeDifference } from '@/lib/basescan-utils';
import { useState } from 'react';

interface TransactionDetailsProps {
  order: PretiumOrder;
}

export function TransactionDetails({ order }: TransactionDetailsProps) {
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const handleCopy = async (text: string, label: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopySuccess(label);
      setTimeout(() => setCopySuccess(null), 2000);
    }
  };

  const getDestination = () => {
    if (order.payment_type === 'MOBILE') return order.phone_number;
    if (order.payment_type === 'BUY_GOODS') return `Till: ${order.till_number}`;
    if (order.payment_type === 'PAYBILL') return `Paybill: ${order.paybill_number} (${order.paybill_account})`;
    return 'N/A';
  };

  return (
    <div className="p-6 bg-[#111] border border-gray-800/50 rounded-xl space-y-6">
      {/* Transaction Code & Hash */}
      <div>
        <p className="text-xs text-gray-500 mb-1">Transaction Code</p>
        <div className="flex items-center gap-2">
          <p className="text-sm font-mono text-white">{order.transaction_code}</p>
          <button
            onClick={() => handleCopy(order.transaction_code, 'code')}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {copySuccess === 'code' ? '✓' : 'Copy'}
          </button>
        </div>
      </div>

      {order.transaction_hash && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Blockchain Transaction</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-mono text-white">{truncateHash(order.transaction_hash)}</p>
            <button
              onClick={() => handleCopy(order.transaction_hash!, 'hash')}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              {copySuccess === 'hash' ? '✓' : 'Copy'}
            </button>
            <a
              href={getBaseScanTxUrl(order.transaction_hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              BaseScan 🔗
            </a>
          </div>
        </div>
      )}

      {/* Financial Details */}
      <div className="border-t border-white/10 pt-4">
        <p className="text-xs text-gray-500 mb-3">Financial Details</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-400">USDC Amount</p>
            <p className="text-white font-medium">{order.amount_in_usdc} USDC</p>
          </div>
          <div>
            <p className="text-gray-400">KES Amount</p>
            <p className="text-white font-medium">{order.amount_in_local?.toLocaleString()} KES</p>
          </div>
          <div>
            <p className="text-gray-400">Exchange Rate</p>
            <p className="text-white font-medium">{order.exchange_rate}</p>
          </div>
          <div>
            <p className="text-gray-400">Fee (1%)</p>
            <p className="text-white font-medium">{order.sender_fee} KES</p>
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="border-t border-white/10 pt-4">
        <p className="text-xs text-gray-500 mb-3">Payment Information</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Type</span>
            <span className="text-white font-medium">{order.payment_type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Destination</span>
            <span className="text-white font-medium">{getDestination()}</span>
          </div>
          {order.account_name && (
            <div className="flex justify-between">
              <span className="text-gray-400">Account Name</span>
              <span className="text-white font-medium">{order.account_name}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-400">Network</span>
            <span className="text-white font-medium">{order.mobile_network || 'SAFARICOM'}</span>
          </div>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="border-t border-white/10 pt-4">
        <p className="text-xs text-gray-500 mb-3">Status Timeline</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Created</span>
            <span className="text-white">{formatEATDate(order.created_at)}</span>
          </div>
          {order.completed_at && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-400">Completed</span>
                <span className="text-white">{formatEATDate(order.completed_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Duration</span>
                <span className="text-white font-medium">
                  {getTimeDifference(order.created_at, order.completed_at)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Receipt Information */}
      {order.receipt_number && (
        <div className="border-t border-white/10 pt-4">
          <p className="text-xs text-gray-500 mb-3">Receipt Information</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">M-Pesa Code</span>
              <span className="text-white font-mono font-medium">{order.receipt_number}</span>
            </div>
            {order.public_name && (
              <div className="flex justify-between">
                <span className="text-gray-400">Recipient</span>
                <span className="text-white font-medium">{order.public_name}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Wallet & Settlement */}
      <div className="border-t border-white/10 pt-4">
        <p className="text-xs text-gray-500 mb-3">Addresses</p>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-gray-400 mb-1">Wallet</p>
            <div className="flex items-center gap-2">
              <p className="text-white font-mono text-xs">{truncateHash(order.wallet_address, 8, 6)}</p>
              <button
                onClick={() => handleCopy(order.wallet_address, 'wallet')}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                {copySuccess === 'wallet' ? '✓' : 'Copy'}
              </button>
              <a
                href={getBaseScanAddressUrl(order.wallet_address)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                View 🔗
              </a>
            </div>
          </div>
          {order.settlement_address && (
            <div>
              <p className="text-gray-400 mb-1">Settlement (Pretium)</p>
              <div className="flex items-center gap-2">
                <p className="text-white font-mono text-xs">{truncateHash(order.settlement_address, 8, 6)}</p>
                <a
                  href={getBaseScanAddressUrl(order.settlement_address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  View 🔗
                </a>
              </div>
            </div>
          )}
          {order.fid && (
            <div className="flex justify-between">
              <span className="text-gray-400">Farcaster ID</span>
              <span className="text-white font-medium">{order.fid}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
