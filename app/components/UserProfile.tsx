"use client";

import { useEffect, useState } from 'react';
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyExpenditure, setDailyExpenditure] = useState<DailyExpenditure[]>([]);

  useEffect(() => {
    if (!address) {
      setActiveTab('home');
      return;
    }

    loadUserTransactions();
  }, [address, setActiveTab]);

  const loadUserTransactions = async () => {
    if (!address) return;

    try {
      setLoading(true);
      // Fetch orders directly from PayCrest API
      const response = await fetch('/api/paycrest/orders?network=base&token=USDC');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      console.log('PayCrest API response structure:', data);
      console.log('Total orders found:', data.data?.orders?.length || 0);
      console.log('User wallet address:', address);
      
      // PayCrest returns orders in data.orders array
      const ordersArray = data.data?.orders || [];
      
      // Debug: log some sample addresses
      console.log('Sample receiveAddresses:', ordersArray.slice(0, 2).map((o: PayCrestOrder) => o.receiveAddress));
      console.log('Sample fromAddresses:', ordersArray.slice(0, 2).map((o: PayCrestOrder) => o.fromAddress));
      console.log('Sample returnAddresses:', ordersArray.slice(0, 2).map((o: PayCrestOrder) => o.returnAddress));
      
      // Filter orders by current wallet address (sender is returnAddress or fromAddress)
      const userOrders = ordersArray.filter((order: PayCrestOrder) => 
        order.returnAddress?.toLowerCase() === address?.toLowerCase() ||
        order.fromAddress?.toLowerCase() === address?.toLowerCase()
      );
      
      console.log('Filtered user orders:', userOrders.length);
      
      // Convert PayCrest order format to our Order interface
      const convertedOrders = userOrders.map((order: PayCrestOrder) => ({
        id: order.id,
        paycrest_order_id: order.id,
        wallet_address: order.fromAddress, // Use sender address
        amount_in_usdc: parseFloat(order.amount),
        amount_in_local: parseFloat(order.amount) * parseFloat(order.rate), // Calculate local amount
        local_currency: order.recipient.currency,
        phone_number: order.recipient.accountIdentifier,
        account_number: order.recipient.accountIdentifier,
        status: order.status,
        created_at: order.createdAt,
        memo: order.recipient.memo,
        rate: parseFloat(order.rate)
      }));
      
      setOrders(convertedOrders);
      
      // Calculate daily expenditure
      const daily = calculateDailyExpenditure(convertedOrders);
      setDailyExpenditure(daily);
    } catch (err) {
      setError('Failed to load transaction history from PayCrest');
      console.error('Error loading transactions from PayCrest:', err);
    } finally {
      setLoading(false);
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
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 7); // Last 7 days
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
            <p className="text-white text-2xl font-bold">{orders.length}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Successful Payments</p>
            <p className="text-green-400 text-2xl font-bold">
              {orders.filter(o => o.status === 'completed' || o.status === 'fulfilled' || o.status === 'settled').length}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-gray-400 text-sm">This Month (USDC)</p>
            <p className="text-blue-400 text-2xl font-bold">
              ${orders
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

      {/* Daily Expenditure Chart */}
      {dailyExpenditure.length > 0 && (
        <div className="glass-effect rounded-3xl p-8">
          <h3 className="text-white font-bold text-lg mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {dailyExpenditure.map((day) => (
              <div key={day.date} className="flex items-center justify-between py-3 border-b border-white/10 last:border-b-0">
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
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="glass-effect rounded-3xl p-8">
        <h3 className="text-white font-bold text-lg mb-4">Transaction History</h3>
        
        {orders.length === 0 ? (
          <div className="text-center py-8">
            <Icon name="star" size="lg" className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No transactions yet</p>
            <p className="text-gray-500 text-sm">Start by making your first payment</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 10).map((order) => (
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
            
            {orders.length > 10 && (
              <div className="text-center pt-4">
                <p className="text-gray-400 text-sm">
                  Showing 10 of {orders.length} transactions
                </p>
              </div>
            )}
          </div>
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