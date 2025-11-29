'use client';

import { useState, useEffect, useMemo } from 'react';

interface RevenueOrder {
  id: string;
  paycrest_order_id: string;
  wallet_address: string;
  amount_in_usdc: number;
  amount_in_local: number;
  local_currency: string;
  sender_fee: number;
  transaction_fee: number;
  status: string;
  created_at: string;
  phone_number?: string;
  account_number?: string;
  account_name?: string;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
  txCount: number;
  avgFee: number;
  kesRevenue: number;
  ngnRevenue: number;
  kesCount: number;
  ngnCount: number;
}

interface AnalyticsData {
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    averageFeePerTx: number;
    revenueByPeriod: {
      today: number;
      week: number;
      month: number;
      allTime: number;
    };
    revenueByCurrency: {
      KES: { total: number; count: number; avgFee: number };
      NGN: { total: number; count: number; avgFee: number };
    };
    growthMetrics: {
      revenueGrowth: number;
    };
  };
  dailyRevenue: Array<{ date: string; revenue: number; txCount: number; avgFee: number }>;
  monthlyRevenue: MonthlyRevenue[];
  orders: RevenueOrder[];
}

type DateFilter = 'all' | 'today' | 'week' | 'month';
type CurrencyFilter = 'all' | 'KES' | 'NGN';

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [cacheInfo, setCacheInfo] = useState<{ cached?: boolean; cacheAge?: string } | null>(null);

  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Filter states
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>('all');

  const ordersPerPage = 20;

  useEffect(() => {
    // Check if password is stored in sessionStorage
    const storedPassword = sessionStorage.getItem('analytics_password');
    if (storedPassword) {
      setPassword(storedPassword);
      setIsAuthenticated(true);
      fetchAnalyticsData(storedPassword);
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAnalyticsData = async (pwd?: string) => {
    try {
      setLoading(true);
      setError(null);

      const passwordToUse = pwd || password;

      const response = await fetch('/api/analytics', {
        headers: {
          'Authorization': `Bearer ${passwordToUse}`
        }
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        sessionStorage.removeItem('analytics_password');
        throw new Error('Invalid password');
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (!data.analytics) {
        throw new Error('Invalid response format');
      }

      setAnalyticsData(data.analytics);
      setCacheInfo({ cached: data.cached, cacheAge: data.cacheAge });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!password.trim()) {
      setAuthError('Please enter a password');
      return;
    }

    sessionStorage.setItem('analytics_password', password);
    setIsAuthenticated(true);
    fetchAnalyticsData(password);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('analytics_password');
    setIsAuthenticated(false);
    setPassword('');
    setAnalyticsData(null);
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatMonthName = (monthStr: string) => {
    try {
      const [year, month] = monthStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleString('en-US', { year: 'numeric', month: 'long' });
    } catch {
      return monthStr;
    }
  };

  // Filter orders
  const filteredOrders = useMemo(() => {
    if (!analyticsData) return [];

    let orders = analyticsData.orders;

    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }

      orders = orders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= filterDate;
      });
    }

    if (currencyFilter !== 'all') {
      orders = orders.filter(order => order.local_currency === currencyFilter);
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      orders = orders.filter(order =>
        order.paycrest_order_id.toLowerCase().includes(lowerSearch) ||
        order.wallet_address.toLowerCase().includes(lowerSearch) ||
        (order.account_name && order.account_name.toLowerCase().includes(lowerSearch))
      );
    }

    return orders;
  }, [analyticsData, dateFilter, currencyFilter, searchTerm]);

  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + ordersPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, currencyFilter, searchTerm]);

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-full max-w-md px-6">
          <div className="border border-gray-800/50 rounded-2xl p-8 bg-[#111]">
            <div className="flex items-center justify-center mb-6">
              <div className="px-3 py-2 bg-white rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-lg">minisend</span>
              </div>
            </div>
            <h2 className="text-xl font-medium text-white text-center mb-2">Analytics Dashboard</h2>
            <p className="text-sm text-gray-400 text-center mb-6">Enter password to access revenue analytics</p>

            <form onSubmit={handleLogin}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-gray-800/50 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-gray-600 mb-4"
                autoFocus
              />

              {authError && (
                <p className="text-red-400 text-sm mb-4">{authError}</p>
              )}

              {error && (
                <p className="text-red-400 text-sm mb-4">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Authenticating...' : 'Access Analytics'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <div className="border-b border-gray-800/50">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="h-6 w-48 bg-gray-800 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border border-gray-800/50 rounded-2xl p-6 bg-[#111]">
                <div className="h-4 w-20 bg-gray-800 rounded animate-pulse mb-4"></div>
                <div className="h-8 w-32 bg-gray-800 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h3 className="text-white font-medium mb-2">Unable to load data</h3>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => fetchAnalyticsData()}
              className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              Retry
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="border-b border-gray-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-4 sm:py-6">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="px-2 py-1 sm:px-3 sm:py-1.5 bg-white rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-sm sm:text-base">minisend</span>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Revenue Analytics</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              {cacheInfo?.cached && (
                <div className="hidden sm:flex items-center space-x-2 bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs border border-blue-500/20">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                  <span>Cached ({cacheInfo.cacheAge})</span>
                </div>
              )}
              <div className="hidden sm:flex items-center space-x-2 bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-sm border border-green-500/20">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Live</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-2 py-1 sm:px-3 sm:py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs sm:text-sm transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-12">
          <MetricCard
            label="Total Revenue"
            value={`$${analyticsData.summary.totalRevenue.toFixed(4)}`}
            sublabel="USDC earned"
            growth={analyticsData.summary.growthMetrics.revenueGrowth}
          />
          <MetricCard
            label="Transactions"
            value={analyticsData.summary.totalTransactions.toString()}
            sublabel="Completed orders"
          />
          <MetricCard
            label="Avg Fee"
            value={`$${analyticsData.summary.averageFeePerTx.toFixed(4)}`}
            sublabel="Per transaction"
          />
          <MetricCard
            label="This Week"
            value={`$${analyticsData.summary.revenueByPeriod.week.toFixed(4)}`}
            sublabel="Last 7 days"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="border border-gray-800/50 rounded-2xl p-4 sm:p-6 bg-[#111]">
            <h3 className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4">KES Revenue</h3>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex justify-between">
                <span className="text-xs sm:text-sm text-gray-400">Total</span>
                <span className="text-xs sm:text-sm text-white font-medium">${analyticsData.summary.revenueByCurrency.KES.total.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs sm:text-sm text-gray-400">Transactions</span>
                <span className="text-xs sm:text-sm text-white font-medium">{analyticsData.summary.revenueByCurrency.KES.count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs sm:text-sm text-gray-400">Avg Fee</span>
                <span className="text-xs sm:text-sm text-white font-medium">${analyticsData.summary.revenueByCurrency.KES.avgFee.toFixed(4)}</span>
              </div>
            </div>
          </div>

          <div className="border border-gray-800/50 rounded-2xl p-4 sm:p-6 bg-[#111]">
            <h3 className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4">NGN Revenue</h3>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex justify-between">
                <span className="text-xs sm:text-sm text-gray-400">Total</span>
                <span className="text-xs sm:text-sm text-white font-medium">${analyticsData.summary.revenueByCurrency.NGN.total.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs sm:text-sm text-gray-400">Transactions</span>
                <span className="text-xs sm:text-sm text-white font-medium">{analyticsData.summary.revenueByCurrency.NGN.count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs sm:text-sm text-gray-400">Avg Fee</span>
                <span className="text-xs sm:text-sm text-white font-medium">${analyticsData.summary.revenueByCurrency.NGN.avgFee.toFixed(4)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border border-gray-800/50 rounded-2xl p-4 sm:p-6 bg-[#111] mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg font-medium text-white mb-4 sm:mb-6">Monthly Revenue Breakdown</h3>
          <div className="overflow-x-auto">
            <div className="min-w-full inline-block align-middle">
              <div className="grid gap-3 sm:gap-4">
                {analyticsData.monthlyRevenue.length > 0 ? (
                  analyticsData.monthlyRevenue.slice().reverse().map((monthData) => (
                    <div
                      key={monthData.month}
                      className="border border-gray-800/30 rounded-xl p-4 sm:p-5 hover:bg-[#0a0a0a] transition-colors"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="text-sm sm:text-base font-medium text-white mb-1">
                            {formatMonthName(monthData.month)}
                          </h4>
                          <p className="text-xs sm:text-sm text-gray-400">
                            {monthData.txCount} transaction{monthData.txCount !== 1 ? 's' : ''}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 flex-1">
                          <div>
                            <p className="text-[10px] sm:text-xs text-gray-400 mb-1">Total Revenue</p>
                            <p className="text-sm sm:text-base font-medium text-green-400">
                              ${monthData.revenue.toFixed(4)}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] sm:text-xs text-gray-400 mb-1">Avg Fee</p>
                            <p className="text-sm sm:text-base font-medium text-white">
                              ${monthData.avgFee.toFixed(4)}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] sm:text-xs text-gray-400 mb-1">KES Revenue</p>
                            <p className="text-sm sm:text-base font-medium text-white">
                              ${monthData.kesRevenue.toFixed(4)}
                            </p>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              {monthData.kesCount} tx
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] sm:text-xs text-gray-400 mb-1">NGN Revenue</p>
                            <p className="text-sm sm:text-base font-medium text-white">
                              ${monthData.ngnRevenue.toFixed(4)}
                            </p>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              {monthData.ngnCount} tx
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-400">No monthly revenue data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-medium text-white">Transaction History</h2>
              <p className="text-xs sm:text-sm text-gray-400">
                {filteredOrders.length} of {analyticsData.orders.length} total orders
              </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1 max-w-sm">
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 bg-[#111] border border-gray-800/50 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-gray-600"
                />
              </div>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className="px-4 py-2 bg-[#111] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-gray-600 cursor-pointer"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>

              <select
                value={currencyFilter}
                onChange={(e) => setCurrencyFilter(e.target.value as CurrencyFilter)}
                className="px-4 py-2 bg-[#111] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-gray-600 cursor-pointer"
              >
                <option value="all">All Currencies</option>
                <option value="KES">KES Only</option>
                <option value="NGN">NGN Only</option>
              </select>
            </div>
          </div>

          <div className="border border-gray-800/50 rounded-2xl overflow-hidden bg-[#111]">
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800/50">
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Order ID</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Wallet</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Amount</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Sender Fee</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Currency</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-800/30 hover:bg-[#0a0a0a] transition-colors">
                      <td className="py-4 px-6">
                        <p className="font-mono text-sm text-white">
                          {order.paycrest_order_id.slice(0, 8)}...
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="font-mono text-sm text-gray-300">
                          {order.wallet_address.slice(0, 6)}...{order.wallet_address.slice(-4)}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-white font-medium">${order.amount_in_usdc.toFixed(2)}</p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-green-400 font-medium">${order.sender_fee.toFixed(4)}</p>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-gray-300">{order.local_currency}</span>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm text-gray-300">{formatTimestamp(order.created_at)}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden divide-y divide-gray-800/50">
              {paginatedOrders.map((order) => (
                <div key={order.id} className="p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-400">Order ID</span>
                    <span className="font-mono text-sm text-white">{order.paycrest_order_id.slice(0, 12)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-400">Amount</span>
                    <span className="text-sm text-white">${order.amount_in_usdc.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-400">Fee</span>
                    <span className="text-sm text-green-400 font-medium">${order.sender_fee.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-400">Date</span>
                    <span className="text-sm text-gray-300">{formatTimestamp(order.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="border-t border-gray-800/50 px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                  <p className="text-xs sm:text-sm text-gray-400">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 sm:py-1 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-900/50 disabled:cursor-not-allowed border border-gray-800 rounded text-xs sm:text-sm"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 sm:py-1 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-900/50 disabled:cursor-not-allowed border border-gray-800 rounded text-xs sm:text-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sublabel, growth }: {
  label: string;
  value: string;
  sublabel: string;
  growth?: number;
}) {
  return (
    <div className="border border-gray-800/50 rounded-xl sm:rounded-2xl p-3 sm:p-6 bg-[#111]">
      <div className="space-y-1 sm:space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs sm:text-sm text-gray-400">{label}</p>
          {growth !== undefined && (
            <div className={`flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs ${growth > 0 ? 'text-green-400' : growth < 0 ? 'text-red-400' : 'text-gray-500'}`}>
              {growth > 0 && (
                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
                </svg>
              )}
              {growth < 0 && (
                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                </svg>
              )}
              <span className="hidden sm:inline">{growth > 0 ? '+' : ''}{growth.toFixed(1)}%</span>
              <span className="sm:hidden">{growth > 0 ? '+' : ''}{growth.toFixed(0)}%</span>
            </div>
          )}
        </div>
        <p className="text-lg sm:text-2xl font-medium text-white break-all">{value}</p>
        <p className="text-[10px] sm:text-xs text-gray-500">{sublabel}</p>
      </div>
    </div>
  );
}
