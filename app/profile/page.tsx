'use client';

import { useAccount } from 'wagmi';
import { useState, useEffect } from 'react';
import { CompactReceiptButton } from '../components/DownloadButton';
import type { OrderData } from '@/lib/types/order';

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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl p-6 mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Transaction History</h1>
          <p className="text-gray-400 text-sm">
            Wallet: {address?.substring(0, 6)}...{address?.substring(address.length - 4)}
          </p>
        </div>

        {/* Transactions List */}
        {loading ? (
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl p-12 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Loading transactions...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl p-12 text-center">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-gray-400">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800/50 hover:border-purple-500/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-white">
                        {tx.amount_in_local.toLocaleString()} {tx.local_currency}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          tx.status === 'completed'
                            ? 'bg-green-500/20 text-green-400'
                            : tx.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">
                      ≈ ${tx.amount_in_usdc.toFixed(2)} USDC
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 text-xs">
                      {new Date(tx.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-gray-600 text-xs">
                      {new Date(tx.created_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                {/* Transaction Details */}
                <div className="space-y-2 mb-4">
                  {tx.account_name && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Recipient</span>
                      <span className="text-gray-300">{tx.account_name}</span>
                    </div>
                  )}
                  {tx.phone_number && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Phone</span>
                      <span className="text-gray-300">{tx.phone_number}</span>
                    </div>
                  )}
                  {tx.pretium_receipt_number && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">M-Pesa Code</span>
                      <span className="text-green-400 font-mono font-semibold">
                        {tx.pretium_receipt_number}
                      </span>
                    </div>
                  )}
                  {tx.transaction_hash && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">TX Hash</span>
                      <a
                        href={`https://basescan.org/tx/${tx.transaction_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 font-mono text-xs"
                      >
                        {tx.transaction_hash.substring(0, 10)}...
                        {tx.transaction_hash.substring(tx.transaction_hash.length - 8)}
                      </a>
                    </div>
                  )}
                </div>

                {/* Download Receipt Button */}
                {tx.status === 'completed' && tx.payment_provider === 'PRETIUM_KES' && tx.pretium_transaction_code && (
                  <CompactReceiptButton
                    orderData={{
                      id: tx.id,
                      amount_in_usdc: tx.amount_in_usdc,
                      amount_in_local: tx.amount_in_local,
                      local_currency: tx.local_currency as 'KES' | 'NGN',
                      account_name: tx.account_name || '',
                      phone_number: tx.phone_number,
                      wallet_address: address || '',
                      rate: 0,
                      sender_fee: 0,
                      transaction_fee: 0,
                      status: tx.status as 'completed' | 'pending' | 'failed',
                      created_at: tx.created_at,
                      blockchain_tx_hash: tx.transaction_hash,
                      pretium_transaction_code: tx.pretium_transaction_code,
                      pretium_receipt_number: tx.pretium_receipt_number,
                    } as OrderData}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
