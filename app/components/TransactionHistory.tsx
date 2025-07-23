"use client";

import { useState, useEffect } from 'react';
import { PaymentOrder } from '@/lib/supabase/types';
import { CURRENCIES } from './CurrencySelector';
import { useAccount } from 'wagmi';
import { useMiniKit } from '@coinbase/onchainkit/minikit';

interface TransactionHistoryProps {
  limit?: number;
  showHeader?: boolean;
}

export function TransactionHistory({ limit = 10, showHeader = true }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dual wallet system: MiniKit for Farcaster, Wagmi for web
  const { context } = useMiniKit();
  const { address: wagmiAddress } = useAccount();
  
  // Enhanced Farcaster detection and wallet logic
  const farcasterAddress = (context?.user as { walletAddress?: string })?.walletAddress;
  const address = farcasterAddress || wagmiAddress;

  useEffect(() => {
    if (address) {
      fetchTransactionHistory();
    }
  }, [address]);

  const fetchTransactionHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/transactions/history?wallet=${address}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch transaction history');
      }

      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('Error fetching transaction history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'payment_order.validated':
      case 'payment_order.settled':
        return 'text-green-400 bg-green-400/20 border-green-400/30';
      case 'payment_order.pending':
        return 'text-yellow-400 bg-yellow-400/20 border-yellow-400/30';
      case 'payment_order.refunded':
      case 'payment_order.expired':
        return 'text-red-400 bg-red-400/20 border-red-400/30';
      default:
        return 'text-gray-400 bg-gray-400/20 border-gray-400/30';
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'payment_order.validated':
        return 'Completed';
      case 'payment_order.settled':
        return 'Settled';
      case 'payment_order.pending':
        return 'Pending';
      case 'payment_order.refunded':
        return 'Refunded';
      case 'payment_order.expired':
        return 'Expired';
      default:
        return status.replace('payment_order.', '');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!address) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-400">Connect your wallet to view transaction history</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {showHeader && (
          <h3 className="text-lg font-bold text-white">Transaction History</h3>
        )}
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white/5 rounded-xl p-4 animate-pulse">
              <div className="flex justify-between items-center mb-2">
                <div className="h-4 bg-white/10 rounded w-32"></div>
                <div className="h-6 bg-white/10 rounded-full w-20"></div>
              </div>
              <div className="flex justify-between text-sm">
                <div className="h-3 bg-white/10 rounded w-24"></div>
                <div className="h-3 bg-white/10 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-6">
        <div className="text-red-400 mb-2">Failed to load transactions</div>
        <button
          onClick={fetchTransactionHistory}
          className="text-blue-400 hover:text-blue-300 text-sm underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center p-6">
        {showHeader && (
          <h3 className="text-lg font-bold text-white mb-4">Transaction History</h3>
        )}
        <div className="bg-white/5 rounded-xl p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-400 mb-2">No transactions yet</p>
          <p className="text-gray-500 text-sm">Your transaction history will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">Transaction History</h3>
          <button
            onClick={fetchTransactionHistory}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            Refresh
          </button>
        </div>
      )}

      <div className="space-y-3">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="relative bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-200"
          >
            {/* Transaction Header */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-white font-medium">
                    ${tx.amount} → {CURRENCIES[tx.currency as keyof typeof CURRENCIES]?.symbol} {tx.local_amount.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-400">
                    {CURRENCIES[tx.currency as keyof typeof CURRENCIES]?.flag}
                  </span>
                </div>
                <div className="text-sm text-gray-400">
                  To: {tx.recipient_name}
                </div>
              </div>
              
              <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(tx.status)}`}>
                {getStatusDisplay(tx.status)}
              </div>
            </div>

            {/* Transaction Details */}
            <div className="flex justify-between items-center text-sm">
              <div className="text-gray-400">
                {formatDate(tx.created_at)}
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-gray-400">
                  {tx.recipient_institution}
                </div>
                
                {tx.transaction_hash && (
                  <a
                    href={`https://basescan.org/tx/${tx.transaction_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-xs"
                  >
                    View TX ↗
                  </a>
                )}
              </div>
            </div>

            {/* Progress Bar for Pending Transactions */}
            {tx.status === 'payment_order.pending' && (
              <div className="mt-3">
                <div className="w-full bg-white/10 rounded-full h-1">
                  <div className="bg-yellow-400 h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
                <div className="text-xs text-yellow-400 mt-1">Processing...</div>
              </div>
            )}

            {/* Error Details */}
            {tx.error_details && (
              <div className="mt-3 p-2 bg-red-500/10 border border-red-400/20 rounded-lg">
                <div className="text-red-400 text-xs">
                  Error: {JSON.stringify(tx.error_details)}
                </div>
              </div>
            )}
          </div>
        ))}

        {transactions.length >= limit && (
          <div className="text-center pt-4">
            <button
              onClick={() => {
                // TODO: Implement pagination or "load more"
                console.log('Load more transactions');
              }}
              className="text-blue-400 hover:text-blue-300 text-sm underline"
            >
              View all transactions
            </button>
          </div>
        )}
      </div>
    </div>
  );
}