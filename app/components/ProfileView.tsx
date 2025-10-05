"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { base } from 'viem/chains';
import { Name, Avatar } from '@coinbase/onchainkit/identity';
import { Button, Icon } from './BaseComponents';
import { Order } from '../../lib/supabase/config';


interface ProfileViewProps {
  setActiveTab: (tab: string) => void;
}

interface DailyExpenditure {
  date: string;
  totalUSDC: number;
  totalLocal: number;
  currency: string;
  count: number;
}

export function ProfileView({ setActiveTab }: ProfileViewProps) {
  const { address } = useAccount();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [displayedOrders, setDisplayedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyExpenditure, setDailyExpenditure] = useState<DailyExpenditure[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(20);
  const [dailyDisplayLimit, setDailyDisplayLimit] = useState(5);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [loadingStatuses, setLoadingStatuses] = useState(false);

  const loadAllUserTransactions = useCallback(async () => {
    if (!address) return;

    try {
      setLoading(true);

      // Fetch user orders with reduced initial limit for faster loading
      const response = await fetch(`/api/user/orders?wallet=${address}&limit=100`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const allUserOrders: Order[] = data.orders || [];

      // Sort by most recent first
      allUserOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Set all orders and initial display
      setAllOrders(allUserOrders);
      setDisplayedOrders(allUserOrders.slice(0, displayLimit));

      // Calculate daily expenditure from ALL transactions
      const daily = calculateDailyExpenditure(allUserOrders);
      setDailyExpenditure(daily);

    } catch {
      setError('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  }, [address, displayLimit]);

  useEffect(() => {
    if (!address) {
      setActiveTab('home');
      return;
    }

    loadAllUserTransactions();
  }, [address, setActiveTab, loadAllUserTransactions]);

  const filterOrdersByDate = (orders: Order[], dateStr: string) => {
    return orders.filter(order => {
      const orderDate = new Date(order.created_at).toISOString().split('T')[0];
      return orderDate === dateStr;
    });
  };

  const handleDateClick = (dateStr: string) => {
    if (selectedDate === dateStr) {
      // If clicking the same date, show all orders
      setSelectedDate(null);
      setDisplayedOrders(allOrders.slice(0, displayLimit));
    } else {
      // Filter by selected date
      setSelectedDate(dateStr);
      const filtered = filterOrdersByDate(allOrders, dateStr);
      setDisplayedOrders(filtered);
      setDisplayLimit(20); // Reset display limit when filtering
    }
  };

  const calculateDailyExpenditure = (orders: Order[]): DailyExpenditure[] => {
    const dailyMap = new Map<string, DailyExpenditure>();

    orders.forEach(order => {
      if (order.status === 'completed' || order.status === 'fulfilled' || order.status === 'settled') {
        const date = new Date(order.created_at).toISOString().split('T')[0];
        
        if (!dailyMap.has(date)) {
          dailyMap.set(date, {
            date,
            totalUSDC: 0,
            totalLocal: 0,
            currency: order.local_currency,
            count: 0
          });
        }

        const daily = dailyMap.get(date)!;
        daily.totalUSDC += order.amount_in_usdc;
        daily.totalLocal += order.amount_in_local;
        daily.count += 1;
      }
    });

    return Array.from(dailyMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getPaymentDestination = (order: Order) => {
    // Check memo for paybill information
    if (order.memo && order.memo.includes('Account:')) {
      const paybillMatch = order.phone_number?.match(/\d+/);
      const accountMatch = order.memo.match(/Account:\s*(\d+)/);
      if (paybillMatch && accountMatch) {
        return `Paybill ${paybillMatch[0]} (${accountMatch[1]})`;
      }
    }
    
    // Check if it's a till number (phone number that's actually a till)
    if (order.phone_number && order.phone_number.length <= 8 && /^\d+$/.test(order.phone_number)) {
      return `Till ${order.phone_number}`;
    }
    
    // Regular phone or account
    return order.phone_number || order.account_number || 'Unknown';
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
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'fulfilled':
      case 'settled':
        return 'text-green-400';
      case 'pending':
      case 'processing':
      case 'validated':
        return 'text-yellow-400';
      case 'failed':
      case 'cancelled':
      case 'expired':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'fulfilled':
      case 'settled':
        return 'check';
      case 'pending':
      case 'processing':
      case 'validated':
        return 'sparkles';
      case 'failed':
      case 'cancelled':
      case 'expired':
        return 'star'; // Using star as placeholder
      default:
        return 'star';
    }
  };

  const openBaseScan = (txHash: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const baseScanUrl = `https://basescan.org/tx/${txHash}`;
    window.open(baseScanUrl, '_blank', 'noopener,noreferrer');
  };

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const fetchLatestStatuses = useCallback(async () => {
    if (!address || allOrders.length === 0) return;

    setLoadingStatuses(true);
    try {
      const updatedOrders = await Promise.all(
        allOrders.slice(0, 20).map(async (order) => {
          try {
            const response = await fetch(`/api/paycrest/status/${order.paycrest_order_id}`);
            if (response.ok) {
              const data = await response.json();
              return {
                ...order,
                status: data.order?.status || order.status,
                paycrest_status: data.order?.status || order.paycrest_status,
                transaction_hash: data.order?.txHash || order.transaction_hash,
              };
            }
            return order;
          } catch {
            return order;
          }
        })
      );

      setAllOrders(updatedOrders);
      setDisplayedOrders(updatedOrders.slice(0, displayLimit));
    } catch {
      // Silent fail - keep existing data
    } finally {
      setLoadingStatuses(false);
    }
  }, [address, allOrders, displayLimit]);

  if (loading) {
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
      <div className="glass-effect rounded-3xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12" />
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Your Profile</h2>
              <Name 
                address={address} 
                chain={base} 
                className="text-gray-300 text-sm font-medium"
              />
            </div>
          </div>
          <Button
            onClick={() => setActiveTab('home')}
            variant="outlined"
            size="medium"
          >
            Back to Home
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Total Transactions</p>
            <p className="text-white text-2xl font-bold">{allOrders.length}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Successful Payments</p>
            <p className="text-green-400 text-2xl font-bold">
              {allOrders.filter(o => o.status === 'completed' || o.status === 'fulfilled' || o.status === 'settled').length}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-gray-400 text-sm">This Month (USDC)</p>
            <p className="text-blue-400 text-2xl font-bold">
              ${allOrders
                .filter(o => 
                  (o.status === 'completed' || o.status === 'fulfilled' || o.status === 'settled') &&
                  new Date(o.created_at).getMonth() === new Date().getMonth()
                )
                .reduce((sum, o) => sum + o.amount_in_usdc, 0)
                .toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Combined Activity & Transaction History */}
      <div className="glass-effect rounded-3xl p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-bold text-lg">
            {selectedDate ? `Transactions for ${formatDate(selectedDate)}` : 'Recent Activity'}
          </h3>
          {selectedDate && (
            <Button
              onClick={() => handleDateClick(selectedDate)}
              variant="ghost"
              size="medium"
              className="text-sm"
            >
              Show All
            </Button>
          )}
        </div>

        {allOrders.length === 0 ? (
          <div className="text-center py-8">
            <Icon name="star" size="lg" className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No transactions yet</p>
            <p className="text-gray-500 text-sm">Start by making your first payment</p>
          </div>
        ) : (
          <>
            {/* Daily Activity Overview (when no specific date is selected) */}
            {!selectedDate && dailyExpenditure.length > 0 && (
              <div>
                <h4 className="text-gray-300 font-medium text-sm mb-3">Recent Activity (Click to view details)</h4>
                <div className="space-y-2">
                  {dailyExpenditure.slice(0, dailyDisplayLimit).map((day) => (
                    <div 
                      key={day.date} 
                      onClick={() => handleDateClick(day.date)}
                      className="flex items-center justify-between py-3 px-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors border border-transparent hover:border-blue-500/20"
                    >
                      <div>
                        <p className="text-white font-medium">{formatDate(day.date)}</p>
                        <p className="text-gray-400 text-sm">{day.count} transaction{day.count !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold">${day.totalUSDC.toFixed(2)}</p>
                        <p className="text-gray-400 text-sm">{day.totalLocal.toFixed(0)} {day.currency}</p>
                      </div>
                    </div>
                  ))}
                  
                  {/* Show More Button for Daily Activity */}
                  {dailyDisplayLimit < dailyExpenditure.length && (
                    <div className="text-center pt-3">
                      <Button
                        onClick={() => setDailyDisplayLimit(prev => prev + 5)}
                        variant="ghost"
                        size="medium"
                        className="text-sm text-blue-400 hover:text-blue-300"
                      >
                        Show More Days
                      </Button>
                      <p className="text-gray-500 text-xs mt-1">
                        Showing {dailyDisplayLimit} of {dailyExpenditure.length} days
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Detailed Transaction List (when a specific date is selected) */}
            {selectedDate && (
              <div className="space-y-3">
                {displayedOrders.map((order) => (
                  <div key={order.id} className="flex items-start justify-between py-4 border-b border-white/10 last:border-b-0">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                        ['completed', 'fulfilled', 'settled'].includes(order.status)
                          ? 'bg-green-500/20'
                          : ['pending', 'processing', 'validated'].includes(order.status)
                            ? 'bg-yellow-500/20'
                            : 'bg-red-500/20'
                      }`}>
                        <Icon
                          name={getStatusIcon(order.status)}
                          size="sm"
                          className={getStatusColor(order.status)}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium">
                          ${order.amount_in_usdc.toFixed(2)} → {getPaymentDestination(order)}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {formatDate(order.created_at)} • {order.local_currency} {order.amount_in_local.toFixed(0)}
                        </p>
                        {order.transaction_hash && (
                          <button
                            onClick={(e) => openBaseScan(order.transaction_hash!, e)}
                            className="mt-1.5 inline-flex items-center gap-1 px-2 py-1 sm:gap-1.5 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/30 transition-all duration-200 group"
                          >
                            <svg
                              className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-400 group-hover:text-blue-300 transition-colors"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            <span className="text-xs sm:text-xs font-medium text-blue-400 group-hover:text-blue-300 transition-colors">
                              View on BaseScan
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <span className={`text-sm font-medium capitalize ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
                
                {/* Total count for filtered transactions */}
                <div className="text-center pt-4">
                  <p className="text-gray-400 text-sm">
                    {displayedOrders.length} transaction{displayedOrders.length !== 1 ? 's' : ''} on {formatDate(selectedDate)}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>


      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}