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
        <div className="max-w-md w-full bg-gray-900/50 backdrop-blur-xl rounded-2xl p-8 text-center">
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
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center">
            <p className="text-gray-300 text-sm">{error}</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400">No transactions</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="p-4 bg-white/5 border border-white/10 rounded-2xl"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-white">
                        {tx.local_currency} {tx.amount_in_local.toLocaleString()}
                      </h3>
                      {tx.status === 'completed' && (
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">
                      ${tx.amount_in_usdc.toFixed(2)} USDC
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-xs">
                      {new Date(tx.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-300">
                    {tx.account_name || tx.phone_number}
                  </div>
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
