"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { Button, Icon } from './DemoComponents';
import { Order } from '../../lib/supabase/config';

interface PayCrestOrder {
  id: string;
  amount: string;
  receiveAddress: string;
  returnAddress: string; // User's wallet address
  fromAddress: string;   // User's wallet address (sender)
  status: string;
  createdAt: string;
  rate: string;
  amountPaid: string;
  recipient: {
    accountIdentifier: string;
    accountName: string;
    currency: string;
    memo: string;
    institution: string;
  };
}

interface UserProfileProps {
  setActiveTab: (tab: string) => void;
}

interface DailyExpenditure {
  date: string;
  totalUSDC: number;
  totalLocal: number;
  currency: string;
  count: number;
}

export function UserProfile({ setActiveTab }: UserProfileProps) {
  const { address } = useAccount();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [displayedOrders, setDisplayedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyExpenditure, setDailyExpenditure] = useState<DailyExpenditure[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(20);
  const [dailyDisplayLimit, setDailyDisplayLimit] = useState(5);

  const loadAllUserTransactions = useCallback(async () => {
    if (!address) return;

    try {
      setLoading(true);
      let allUserOrders: Order[] = [];
      let page = 1;
      let hasMore = true;
      const pageSize = 50;

      console.log('Starting to fetch ALL user transactions...');
      console.log('User wallet address:', address);

      // Fetch all pages until we have all transactions
      while (hasMore) {
        console.log(`Fetching page ${page}...`);
        
        const response = await fetch(`/api/paycrest/orders?network=base&token=USDC&page=${page}&pageSize=${pageSize}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        const ordersArray = data.data?.orders || [];
        const totalInSystem = data.data?.total || 0;
        const currentPageSize = data.data?.pageSize || pageSize;
        
        console.log(`Page ${page}: ${ordersArray.length} orders, Total in system: ${totalInSystem}`);
        
        // Filter orders by current wallet address
        const userOrders = ordersArray.filter((order: PayCrestOrder) => 
          order.returnAddress?.toLowerCase() === address?.toLowerCase() ||
          order.fromAddress?.toLowerCase() === address?.toLowerCase()
        );
        
        console.log(`Filtered user orders on page ${page}:`, userOrders.length);
        
        // Convert PayCrest order format to our Order interface
        const convertedOrders = userOrders.map((order: PayCrestOrder) => ({
          id: order.id,
          paycrest_order_id: order.id,
          wallet_address: order.fromAddress,
          amount_in_usdc: parseFloat(order.amount),
          amount_in_local: parseFloat(order.amount) * parseFloat(order.rate),
          local_currency: order.recipient.currency,
          phone_number: order.recipient.accountIdentifier,
          account_number: order.recipient.accountIdentifier,
          status: order.status,
          created_at: order.createdAt,
          memo: order.recipient.memo,
          rate: parseFloat(order.rate)
        }));
        
        allUserOrders = [...allUserOrders, ...convertedOrders];
        
        // Check if we have more pages
        hasMore = (page * currentPageSize) < totalInSystem;
        page++;
        
        // Safety check to prevent infinite loops
        if (page > 20) {
          console.warn('Stopping at page 20 to prevent infinite loop');
          break;
        }
      }
      
      console.log(`✅ Loaded ALL user transactions: ${allUserOrders.length} total`);
      
      // Sort by most recent first
      allUserOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Set all orders and initial display
      setAllOrders(allUserOrders);
      setDisplayedOrders(allUserOrders.slice(0, displayLimit));
      
      // Calculate daily expenditure from ALL transactions
      const daily = calculateDailyExpenditure(allUserOrders);
      setDailyExpenditure(daily);
      
    } catch (err) {
      setError('Failed to load transaction history from PayCrest');
      console.error('Error loading transactions from PayCrest:', err);
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
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Your Profile</h2>
            <p className="text-gray-400 text-sm">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
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
            {selectedDate ? `Transactions for ${formatDate(selectedDate)}` : 'Transaction History'}
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
                  <div key={order.id} className="flex items-center justify-between py-4 border-b border-white/10 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
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
                      <div>
                        <p className="text-white font-medium">
                          ${order.amount_in_usdc.toFixed(2)} → {getPaymentDestination(order)}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {formatDate(order.created_at)} • {order.local_currency} {order.amount_in_local.toFixed(0)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
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