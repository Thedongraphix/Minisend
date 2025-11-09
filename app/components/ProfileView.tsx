"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { base } from 'viem/chains';
import { Name, Avatar } from '@coinbase/onchainkit/identity';
import { Button, Icon } from './BaseComponents';
import { Order } from '../../lib/supabase/config';
import { CompactReceiptButton } from './DownloadButton';
import { OrderData } from '../../lib/types/order';


interface ProfileViewProps {
  setActiveTab: (tab: string) => void;
}

interface TransactionStats {
  totalTransactions: number;
  totalVolumeUSDC: number;
}

// Helper function to convert Order to OrderData for receipt generation
function convertOrderToOrderData(order: Order): OrderData {
  return {
    id: order.id,
    paycrest_order_id: order.paycrest_order_id,
    amount_in_usdc: order.amount_in_usdc,
    amount_in_local: order.amount_in_local,
    local_currency: order.local_currency,
    account_name: order.account_name || 'Unknown',
    phone_number: order.phone_number,
    account_number: order.account_number,
    wallet_address: order.wallet_address,
    rate: order.rate || 0,
    sender_fee: order.sender_fee || 0,
    transaction_fee: order.transaction_fee || 0,
    status: order.status as 'completed' | 'pending' | 'failed',
    created_at: order.created_at,
    transactionHash: order.transaction_hash,
    blockchain_tx_hash: order.transaction_hash,
  };
}

export function ProfileView({ setActiveTab }: ProfileViewProps) {
  const { address } = useAccount();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [displayedOrders, setDisplayedOrders] = useState<Order[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(20);
  const [refreshing, setRefreshing] = useState(false);
  const [viewAll, setViewAll] = useState(false);

  const loadAllUserTransactions = useCallback(async (isBackgroundRefresh = false) => {
    if (!address) return;

    try {
      if (!isBackgroundRefresh) {
        setInitialLoading(true);
      }

      const response = await fetch(`/api/user/orders?wallet=${address}&limit=1000`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const allUserOrders: Order[] = data.orders || [];

      allUserOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setAllOrders(allUserOrders);

      if (selectedDate) {
        const filtered = filterOrdersByDate(allUserOrders, selectedDate);
        setDisplayedOrders(filtered);
      } else {
        setDisplayedOrders(allUserOrders.slice(0, displayLimit));
      }

    } catch {
      if (!isBackgroundRefresh) {
        setError('Failed to load transaction history');
      }
    } finally {
      if (!isBackgroundRefresh) {
        setInitialLoading(false);
      }
    }
  }, [address, displayLimit, selectedDate]);

  useEffect(() => {
    if (!address) {
      setActiveTab('home');
      return;
    }

    loadAllUserTransactions(false);

    const interval = setInterval(() => {
      loadAllUserTransactions(true);
    }, 60000);

    return () => clearInterval(interval);
  }, [address, setActiveTab, loadAllUserTransactions]);

  const refreshStatuses = async () => {
    setRefreshing(true);
    await loadAllUserTransactions(true);
    setRefreshing(false);
  };

  const filterOrdersByDate = (orders: Order[], dateStr: string) => {
    return orders.filter(order => {
      const orderDate = new Date(order.created_at).toISOString().split('T')[0];
      return orderDate === dateStr;
    });
  };

  const handleDateClick = (dateStr: string) => {
    if (selectedDate === dateStr) {
      setSelectedDate(null);
      setDisplayedOrders(allOrders.slice(0, displayLimit));
    } else {
      setSelectedDate(dateStr);
      const filtered = filterOrdersByDate(allOrders, dateStr);
      setDisplayedOrders(filtered);
      setDisplayLimit(20);
    }
  };

  const toggleViewAll = () => {
    setViewAll(!viewAll);
    setSelectedDate(null);
  };

  // Calculate statistics - count all transactions
  const stats: TransactionStats = useMemo(() => {
    let totalVolumeUSDC = 0;

    allOrders.forEach(order => {
      const amount = order.amount_in_usdc || 0;
      totalVolumeUSDC += amount;
    });

    return {
      totalTransactions: allOrders.length,
      totalVolumeUSDC,
    };
  }, [allOrders]);

  // Group transactions by date
  const transactionsByDate = useMemo(() => {
    const grouped = new Map<string, Order[]>();

    allOrders.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push(order);
    });

    return Array.from(grouped.entries())
      .map(([date, orders]) => ({ date, orders }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allOrders]);

  const getPaymentDestination = (order: Order) => {
    if (order.memo && order.memo.includes('Account:')) {
      const paybillMatch = order.phone_number?.match(/\d+/);
      const accountMatch = order.memo.match(/Account:\s*(\d+)/);
      if (paybillMatch && accountMatch) {
        return `Paybill ${paybillMatch[0]} (${accountMatch[1]})`;
      }
    }

    if (order.phone_number && order.phone_number.length <= 8 && /^\d+$/.test(order.phone_number)) {
      return `Till ${order.phone_number}`;
    }

    // Add +254 prefix to phone numbers
    if (order.phone_number) {
      const cleanNumber = order.phone_number.replace(/\D/g, '');
      if (cleanNumber.length === 9) {
        return `+254${cleanNumber}`;
      }
      return order.phone_number;
    }

    return order.account_number || 'Unknown';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getStatusColor = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || '';
    if (['completed', 'fulfilled', 'settled'].includes(normalizedStatus)) {
      return 'text-blue-400';
    } else if (['pending', 'processing', 'validated', 'initiated'].includes(normalizedStatus)) {
      return 'text-gray-400';
    } else if (['failed', 'cancelled', 'expired', 'refunded'].includes(normalizedStatus)) {
      return 'text-gray-500';
    }
    return 'text-gray-400';
  };

  const getStatusBadgeColor = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || '';
    if (['completed', 'fulfilled', 'settled'].includes(normalizedStatus)) {
      return 'bg-blue-500/20 border-blue-500/30 text-blue-400';
    } else if (['pending', 'processing', 'validated', 'initiated'].includes(normalizedStatus)) {
      return 'bg-gray-500/20 border-gray-500/30 text-gray-400';
    } else if (['failed', 'cancelled', 'expired', 'refunded'].includes(normalizedStatus)) {
      return 'bg-gray-600/20 border-gray-600/30 text-gray-500';
    }
    return 'bg-gray-500/20 border-gray-500/30 text-gray-400';
  };

  const getStatusIcon = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || '';
    if (['completed', 'fulfilled', 'settled'].includes(normalizedStatus)) {
      return 'check';
    } else if (['pending', 'processing', 'validated', 'initiated'].includes(normalizedStatus)) {
      return 'sparkles';
    }
    return 'star';
  };

  const openBaseScan = (txHash: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const baseScanUrl = `https://basescan.org/tx/${txHash}`;
    window.open(baseScanUrl, '_blank', 'noopener,noreferrer');
  };

  if (initialLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="glass-effect rounded-3xl p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-white/20 border-t-blue-400 mx-auto mb-4"></div>
            <p className="text-white">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Profile Header */}
      <div className="relative mb-4">
        <div className="flex items-center space-x-3">
          <div className="relative flex-shrink-0">
            <Avatar className="h-12 w-12 ring-2 ring-blue-500/30" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-white mb-0.5 truncate leading-none">
              Your Profile
            </h2>
            <Name
              address={address}
              chain={base}
              className="text-gray-400 text-xs font-medium truncate"
            />
          </div>
          <button
            onClick={() => setActiveTab('home')}
            className="absolute top-0 right-0 sm:static px-2 py-1 sm:px-4 sm:py-2 rounded-lg border border-white/10 hover:border-blue-500/30 text-white hover:text-blue-400 transition-colors text-[10px] sm:text-xs font-medium"
          >
            Back
          </button>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Transactions */}
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-5 h-5 rounded bg-blue-500/20 flex items-center justify-center">
              <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-wide">Transactions</span>
          </div>
          <p className="text-white text-2xl sm:text-3xl font-bold leading-none">{stats.totalTransactions}</p>
        </div>

        {/* Total Volume */}
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-5 h-5 rounded bg-blue-500/20 flex items-center justify-center">
              <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-wide">Volume</span>
          </div>
          <p className="text-white text-2xl sm:text-3xl font-bold leading-none">${stats.totalVolumeUSDC.toFixed(2)}</p>
        </div>
      </div>

      {/* Transaction History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-base sm:text-lg flex items-center gap-1.5">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="hidden sm:inline">Transaction History</span>
            <span className="sm:hidden">History</span>
          </h3>
          <button
            onClick={refreshStatuses}
            disabled={refreshing}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            {refreshing ? (
              <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            <span className="text-xs font-medium text-blue-400 hidden sm:inline">Refresh</span>
          </button>
        </div>

        {allOrders.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="star" size="lg" className="text-blue-400" />
            </div>
            <p className="text-white text-lg font-medium mb-2">No transactions yet</p>
            <p className="text-gray-400 text-sm">Start by making your first payment</p>
          </div>
        ) : viewAll ? (
          // View all transactions
          <div className="space-y-2">
            <button
              onClick={toggleViewAll}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors text-xs font-medium mb-3"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Groups
            </button>

            {allOrders.slice(0, displayLimit).map((order) => {
              const normalizedStatus = order.status?.toLowerCase() || '';
              const isSuccess = ['completed', 'fulfilled', 'settled'].includes(normalizedStatus);

              return (
                <div key={order.id} className="bg-white/5 hover:bg-white/[0.07] rounded-lg p-2.5 border border-white/10 hover:border-blue-500/30 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 ${
                        isSuccess ? 'bg-blue-500/20' : 'bg-gray-500/20'
                      }`}>
                        <Icon
                          name={getStatusIcon(order.status)}
                          size="sm"
                          className={`${getStatusColor(order.status)} w-3.5 h-3.5`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="text-white font-bold text-sm leading-none">
                            ${order.amount_in_usdc.toFixed(2)}
                          </p>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusBadgeColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-gray-400 text-xs truncate leading-none">
                          {getPaymentDestination(order)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-gray-500 text-[10px]">
                            {formatDate(order.created_at)} • {formatTime(order.created_at)}
                          </p>
                          {order.transaction_hash && (
                            <button
                              onClick={(e) => openBaseScan(order.transaction_hash!, e)}
                              className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-[10px]"
                            >
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              <span>BaseScan</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <CompactReceiptButton
                      orderData={convertOrderToOrderData(order)}
                      className="hover:bg-blue-500/10 rounded transition-colors"
                    />
                  </div>
                </div>
              );
            })}

            {allOrders.length > displayLimit && (
              <div className="text-center pt-3">
                <Button
                  onClick={() => setDisplayLimit(prev => prev + 20)}
                  variant="ghost"
                  size="medium"
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Load More
                </Button>
                <p className="text-gray-500 text-[10px] mt-1.5">
                  Showing {displayLimit} of {allOrders.length} transactions
                </p>
              </div>
            )}
          </div>
        ) : selectedDate ? (
          // Detailed view for specific date
          <div className="space-y-2">
            <button
              onClick={() => handleDateClick(selectedDate)}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors text-xs font-medium mb-3"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            {displayedOrders.map((order) => {
              const normalizedStatus = order.status?.toLowerCase() || '';
              const isSuccess = ['completed', 'fulfilled', 'settled'].includes(normalizedStatus);

              return (
                <div key={order.id} className="bg-white/5 hover:bg-white/[0.07] rounded-lg p-2.5 border border-white/10 hover:border-blue-500/30 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 ${
                        isSuccess ? 'bg-blue-500/20' : 'bg-gray-500/20'
                      }`}>
                        <Icon
                          name={getStatusIcon(order.status)}
                          size="sm"
                          className={`${getStatusColor(order.status)} w-3.5 h-3.5`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="text-white font-bold text-sm leading-none">
                            ${order.amount_in_usdc.toFixed(2)}
                          </p>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusBadgeColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-gray-400 text-xs truncate leading-none">
                          {getPaymentDestination(order)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-gray-500 text-[10px]">
                            {formatTime(order.created_at)}
                          </p>
                          {order.transaction_hash && (
                            <button
                              onClick={(e) => openBaseScan(order.transaction_hash!, e)}
                              className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-[10px]"
                            >
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              <span>BaseScan</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <CompactReceiptButton
                      orderData={convertOrderToOrderData(order)}
                      className="hover:bg-blue-500/10 rounded transition-colors"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Date grouped view
          <div className="space-y-2">
            {transactionsByDate.slice(0, displayLimit / 4).map(({ date, orders }) => {
              const successfulOrders = orders.filter(o => ['completed', 'fulfilled', 'settled'].includes(o.status?.toLowerCase() || ''));
              const totalUSDC = successfulOrders.reduce((sum, o) => sum + (o.amount_in_usdc || 0), 0);

              return (
                <div
                  key={date}
                  onClick={() => handleDateClick(date)}
                  className="bg-white/5 hover:bg-white/[0.07] rounded-lg p-2.5 border border-white/10 hover:border-blue-500/30 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-semibold text-sm mb-0.5 leading-none">{formatDate(date)}</p>
                      <p className="text-gray-400 text-[10px]">
                        {orders.length} tx - {successfulOrders.length} completed
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-blue-400 font-bold text-sm leading-none">${totalUSDC.toFixed(2)}</p>
                        <p className="text-gray-500 text-[10px]">volume</p>
                      </div>
                      <svg className="w-4 h-4 text-blue-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })}

            {transactionsByDate.length > displayLimit / 4 && (
              <div className="text-center pt-3">
                <Button
                  onClick={() => setDisplayLimit(prev => prev + 20)}
                  variant="ghost"
                  size="medium"
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Load More
                </Button>
                <p className="text-gray-500 text-[10px] mt-1.5">
                  Showing {Math.min(displayLimit / 4, transactionsByDate.length)} of {transactionsByDate.length} days
                </p>
              </div>
            )}

            {/* View All Button */}
            <div className="text-center pt-3 border-t border-white/10 mt-4">
              <button
                onClick={toggleViewAll}
                className="text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors"
              >
                View All Transactions
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-gray-300 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
