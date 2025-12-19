'use client';

import { useAccount } from 'wagmi';
import { useState, useEffect } from 'react';
import { CompactReceiptButton } from '../components/PretiumReceipt';

interface Transaction {
  id: string;
  amount_in_usdc: number;
  amount_in_local: number;
  local_currency: string;
  status: string;
  created_at: string;
  pretium_receipt_number?: string;
  transaction_hash?: string;
  pretium_transaction_code?: string;
  account_name?: string;
  phone_number?: string;
  payment_provider: string;
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (address) {
      fetchTransactions();
    }
  }, [address]);

  const fetchTransactions = async () => {
    if (!address) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/user/transactions?wallet=${address}`);
      const data = await response.json();

      if (data.success) {
        setTransactions(data.transactions);
      } else {
        setError(data.error || 'Failed to load transactions');
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-900/50 backdrop-blur-xl rounded-3xl border border-white/10 p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Connect Wallet</h1>
          <p className="text-gray-400">Please connect your wallet to view your transaction history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Transactions</h1>
          <p className="text-gray-400 text-sm">
            {address?.substring(0, 6)}...{address?.substring(address.length - 4)}
          </p>
        </div>

        {/* Transactions List */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full mx-auto"></div>
          </div>
        ) : error ? (
          <div className="p-8 bg-red-500/5 border border-red-500/20 rounded-3xl text-center">
            <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-300 font-medium">{error}</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-16 bg-white/5 border border-white/10 rounded-3xl text-center">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-gray-400 text-lg">No transactions yet</p>
            <p className="text-gray-500 text-sm mt-2">Your transaction history will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="group relative p-5 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 transition-all duration-200 hover:border-purple-500/30"
              >
                <div className="flex items-center justify-between">
                  {/* Left side - Transaction info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white">
                        {tx.local_currency} {tx.amount_in_local.toLocaleString()}
                      </h3>
                      {tx.status === 'completed' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                          <span className="text-xs text-green-300 font-medium">Complete</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mb-1.5">
                      <p className="text-gray-400 text-sm font-medium">
                        ${tx.amount_in_usdc.toFixed(2)} USDC
                      </p>
                      <span className="text-gray-600">•</span>
                      <p className="text-gray-500 text-xs">
                        {new Date(tx.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>

                    <div className="text-sm text-gray-300 font-medium">
                      {tx.account_name || tx.phone_number}
                    </div>
                  </div>

                  {/* Right side - Download button */}
                  {tx.status === 'completed' && tx.payment_provider === 'PRETIUM_KES' && tx.pretium_transaction_code && (
                    <CompactReceiptButton
                      transactionCode={tx.pretium_transaction_code}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
