"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAccount } from 'wagmi';
import { base } from 'viem/chains';
import { Name, Avatar } from '@coinbase/onchainkit/identity';
import { Button, Icon } from './BaseComponents';
import { Order } from '../../lib/supabase/config';
import { DownloadButton } from './DownloadButton';
import { CompactReceiptButton } from './PretiumReceipt';
import { OrderData } from '../../lib/types/order';
import { useMinisendAuth } from '@/lib/hooks/useMinisendAuth';
import { useBlockradarBalance } from '@/hooks/useBlockradarBalance';
import Image from 'next/image';
import QRCodeStyling from 'qr-code-styling';


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
    pretium_transaction_code: order.pretium_transaction_code,
    pretium_receipt_number: order.pretium_receipt_number,
    till_number: order.till_number,
    paybill_number: order.paybill_number,
    paybill_account: order.paybill_account,
  };
}

export function ProfileView({ setActiveTab }: ProfileViewProps) {
  const { address } = useAccount();
  const { minisendWallet, user } = useMinisendAuth();

  // Use connected wallet address OR minisend wallet for fetching orders
  const userWallet = address || minisendWallet;

  // Fetch Blockradar gateway balance
  const { 
    balance: blockradarBalance, 
    refetch: refetchBalance, 
    isRefreshing: isBalanceRefreshing 
  } = useBlockradarBalance({
    addressId: user?.blockradarAddressId || null,
    autoFetch: true,
    // Refresh every minute
  });

  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [displayedOrders, setDisplayedOrders] = useState<Order[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(20);
  const [refreshing, setRefreshing] = useState(false);
  const [viewAll, setViewAll] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showDeposit, setShowDeposit] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  const loadAllUserTransactions = useCallback(async (isBackgroundRefresh = false) => {
    if (!userWallet) return;

    try {
      if (!isBackgroundRefresh) {
        setInitialLoading(true);
      }

      const response = await fetch(`/api/user/orders?wallet=${userWallet}&limit=1000`);

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
  }, [userWallet, displayLimit, selectedDate]);

  useEffect(() => {
    if (!userWallet) {
      // Don't redirect if no wallet yet - let user see profile loading
      return;
    }

    loadAllUserTransactions(false);

    const interval = setInterval(() => {
      loadAllUserTransactions(true);
    }, 60000);

    return () => clearInterval(interval);
  }, [userWallet, setActiveTab, loadAllUserTransactions]);

  const refreshStatuses = async () => {
    setRefreshing(true);
    await loadAllUserTransactions(true);
    setRefreshing(false);
  };

  // Generate styled QR code when deposit modal opens
  useEffect(() => {
    if (showDeposit && minisendWallet && qrContainerRef.current) {
      // Clear any existing QR code
      qrContainerRef.current.innerHTML = '';

      const qrCode = new QRCodeStyling({
        width: 188,
        height: 190,
        type: 'canvas',
        data: minisendWallet,
        margin: 0,
        qrOptions: {
          typeNumber: 0,
          mode: 'Byte',
          errorCorrectionLevel: 'H', // High error correction for logo overlay
        },
        imageOptions: {
          hideBackgroundDots: true,
          imageSize: 0.3,
          margin: 4,
        },
        dotsOptions: {
          color: '#8b53ff',
          type: 'rounded', // Rounded dots instead of squares
        },
        cornersSquareOptions: {
          color: '#8b53ff',
          type: 'extra-rounded', // Rounded corner squares
        },
        cornersDotOptions: {
          color: '#8b53ff',
          type: 'dot', // Rounded corner dots
        },
        backgroundOptions: {
          color: '#FFFFFF',
        },
      });

      qrCode.append(qrContainerRef.current);
    }
  }, [showDeposit, minisendWallet]);

  const handleCopyAddress = async () => {
    if (!minisendWallet) return;
    try {
      await navigator.clipboard.writeText(minisendWallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
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

  // Get timezone info based on currency
  const getTimezoneInfo = (currency?: string) => {
    switch (currency) {
      case 'NGN':
        return { timezone: 'Africa/Lagos', abbr: 'WAT' }; // West Africa Time (UTC+1)
      case 'GHS':
        return { timezone: 'Africa/Accra', abbr: 'GMT' }; // Ghana Mean Time (UTC+0)
      case 'KES':
      default:
        return { timezone: 'Africa/Nairobi', abbr: 'EAT' }; // East Africa Time (UTC+3)
    }
  };

  const formatDate = (dateString: string, currency?: string) => {
    // Database now stores proper UTC timestamps
    // Convert to appropriate timezone based on currency
    const date = new Date(dateString);
    const { timezone } = getTimezoneInfo(currency);

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Convert both dates to same timezone for comparison
    const dateInTimezone = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    const todayInTimezone = new Date(today.toLocaleString('en-US', { timeZone: timezone }));
    const yesterdayInTimezone = new Date(yesterday.toLocaleString('en-US', { timeZone: timezone }));

    if (dateInTimezone.toDateString() === todayInTimezone.toDateString()) {
      return 'Today';
    } else if (dateInTimezone.toDateString() === yesterdayInTimezone.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: timezone
      });
    }
  };

  const formatTime = (dateString: string, currency?: string) => {
    // Database now stores proper UTC timestamps
    // Convert to appropriate timezone based on currency
    const date = new Date(dateString);
    const { timezone, abbr } = getTimezoneInfo(currency);

    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone
    });

    return `${timeStr} ${abbr}`;
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
      <div className="relative mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="relative flex-shrink-0">
              <Avatar
                address={userWallet as `0x${string}`}
                chain={base}
                className="h-14 w-14 ring-2 ring-blue-500/30"
              />
            </div>
            <div className="min-w-0 flex-1">
              <Name
                address={userWallet as `0x${string}`}
                chain={base}
                className="text-white text-lg font-bold truncate"
              />
              <div className="flex items-center gap-2 mt-1">
                <p className="text-gray-400 text-xs font-medium">
                  {minisendWallet?.substring(0, 6)}...{minisendWallet?.substring(minisendWallet.length - 4)}
                </p>
                {minisendWallet && (
                  <button
                    onClick={handleCopyAddress}
                    className="p-1 rounded-md hover:bg-white/10 transition-colors"
                    title="Copy address"
                  >
                    {copied ? (
                      <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 text-gray-400 hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Total Transactions
        <div className="bg-white/5 rounded-2xl p-3 sm:p-4 border border-white/10 hover:bg-white/[0.07] hover:border-purple-500/30 transition-all duration-200">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="text-gray-400 text-[9px] sm:text-xs font-semibold uppercase tracking-wide">Txns</span>
          </div>
          <p className="text-white text-xl sm:text-2xl md:text-3xl font-bold leading-none">{stats.totalTransactions}</p>
        </div>
         */}

        {/* Total Volume */}
        <div className="bg-white/5 rounded-2xl p-3 sm:p-4 border border-white/10 hover:bg-white/[0.07] hover:border-purple-500/30 transition-all duration-200">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-gray-400 text-[9px] sm:text-xs font-semibold uppercase tracking-wide">Volume</span>
          </div>
          <p className="text-white text-xl sm:text-2xl md:text-3xl font-bold leading-none">${stats.totalVolumeUSDC.toFixed(2)}</p>
        </div>

        {/* Current Balance */}
        <div className="bg-white/5 rounded-2xl p-3 sm:p-4 border border-white/10 hover:bg-white/[0.07] hover:border-purple-500/30 transition-all duration-200">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
            <div className="w-6 h-5 sm:w-6 sm:h-6 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <span className="text-gray-400 text-[9px] sm:text-xs font-semibold uppercase tracking-wide">Balance</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-white text-xl sm:text-2xl md:text-3xl font-bold leading-none truncate">
              {isBalanceVisible 
                ? (blockradarBalance ? `$${parseFloat(blockradarBalance.balance).toFixed(2)}` : '—')
                : '••••'
              }
            </p>
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Eye icon to toggle visibility */}
              <button
                onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                title={isBalanceVisible ? "Hide balance" : "Show balance"}
              >
                {isBalanceVisible ? (
                  <svg className="w-3.5 h-3.5 text-gray-400 hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-gray-400 hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                )}
              </button>
              {/* Refresh button */}
              {user?.blockradarAddressId && (
                <button
                  onClick={refetchBalance}
                  disabled={isBalanceRefreshing}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 flex-shrink-0"
                  title="Refresh balance"
                >
                  {isBalanceRefreshing ? (
                    <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-gray-400 hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Deposit Section */}
      {minisendWallet && (
        <button
          onClick={() => setShowDeposit(!showDeposit)}
          className="w-full bg-white/5 hover:bg-white/[0.07] border border-white/10 hover:border-white/20 rounded-2xl p-4 transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-white font-semibold text-sm">Deposit USDC</div>
                <div className="text-gray-400 text-xs">Upto 4 networks supported</div>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showDeposit ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
      )}

      {/* Expanded Deposit Details */}
      {showDeposit && minisendWallet && (
        <div className="animate-fade-in">
          <div className="flex flex-col items-center gap-4">
            {/* QR Code - rendered directly without card */}
            <div className="flex-shrink-0 flex flex-col items-center gap-3">
              <div className="relative">
                <div ref={qrContainerRef} className="rounded-xl overflow-hidden" />
                {/* Minisend Logo overlay in center */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1.5 pointer-events-none shadow-sm">
                  <Image
                    src="/logo.svg"
                    alt="Minisend"
                    width={20}
                    height={20}
                    className="w-full h-full"
                  />
                </div>
              </div>

              {/* Blockchain Logos */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white/10 p-1 flex items-center justify-center">
                  <Image src="/Base_Network_Logo.svg" alt="Base" width={14} height={14} />
                </div>
                <div className="w-6 h-6 rounded-full bg-white/10 p-0.5 flex items-center justify-center">
                  <Image src="/polygon-logo.svg" alt="Polygon" width={14} height={14} />
                </div>
                <div className="w-6 h-6 rounded-full bg-white/10 p-0.5 flex items-center justify-center">
                  <Image src="/celo-logo.svg" alt="Celo" width={14} height={14} />
                </div>
                <div className="w-6 h-6 rounded-full bg-white p-0.5 flex items-center justify-center">
                  <Image src="/lisk-logo.svg" alt="Lisk" width={14} height={14} className="invert-0" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
              const isExpanded = expandedCard === order.id;

              return (
                <div
                  key={order.id}
                  className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden transition-all hover:bg-white/[0.07] hover:border-purple-500/30"
                >
                  {/* Collapsed View - Always Visible */}
                  <div
                    onClick={() => setExpandedCard(isExpanded ? null : order.id)}
                    className="p-4 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-white font-bold text-lg">
                            {order.local_currency} {order.amount_in_local.toLocaleString()}
                          </span>
                          {isSuccess && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full">
                              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                              <span className="text-[10px] text-green-300 font-medium">Done</span>
                            </div>
                          )}
                        </div>
                        <div className="text-gray-400 text-xs font-medium truncate">
                          {getPaymentDestination(order)}
                        </div>
                        <div className="text-gray-500 text-[10px] mt-0.5">
                          {formatTime(order.created_at, order.local_currency)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isSuccess && order.pretium_transaction_code && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <CompactReceiptButton
                              transactionCode={order.pretium_transaction_code}
                              className=""
                            />
                          </div>
                        )}
                        {isSuccess && !order.pretium_transaction_code && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const downloadBtn = document.getElementById(`download-${order.id}`);
                              if (downloadBtn) downloadBtn.click();
                            }}
                            className="p-2 bg-purple-600 hover:bg-purple-700 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                            title="Download Receipt"
                          >
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                        )}
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Expanded View */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-gray-500 text-xs mb-1 font-medium">USDC Amount</div>
                          <div className="text-white text-sm font-semibold">
                            ${order.amount_in_usdc.toFixed(2)}
                          </div>
                        </div>

                        <div>
                          <div className="text-gray-500 text-xs mb-1 font-medium">Date</div>
                          <div className="text-white text-sm font-semibold">
                            {formatDate(order.created_at, order.local_currency)}
                          </div>
                        </div>
                      </div>

                      {/* Hidden Download Button for non-Pretium orders */}
                      {isSuccess && !order.pretium_transaction_code && (
                        <div className="hidden">
                          <div id={`download-${order.id}`}>
                            <DownloadButton
                              orderData={convertOrderToOrderData(order)}
                              variant="secondary"
                              size="sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
              const isExpanded = expandedCard === order.id;

              return (
                <div
                  key={order.id}
                  className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden transition-all hover:bg-white/[0.07] hover:border-purple-500/30"
                >
                  {/* Collapsed View - Always Visible */}
                  <div
                    onClick={() => setExpandedCard(isExpanded ? null : order.id)}
                    className="p-4 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-white font-bold text-lg">
                            {order.local_currency} {order.amount_in_local.toLocaleString()}
                          </span>
                          {isSuccess && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full">
                              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                              <span className="text-[10px] text-green-300 font-medium">Done</span>
                            </div>
                          )}
                        </div>
                        <div className="text-gray-400 text-xs font-medium truncate">
                          {getPaymentDestination(order)}
                        </div>
                        <div className="text-gray-500 text-[10px] mt-0.5">
                          {formatTime(order.created_at, order.local_currency)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isSuccess && order.pretium_transaction_code && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <CompactReceiptButton
                              transactionCode={order.pretium_transaction_code}
                              className=""
                            />
                          </div>
                        )}
                        {isSuccess && !order.pretium_transaction_code && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const downloadBtn = document.getElementById(`download-${order.id}`);
                              if (downloadBtn) downloadBtn.click();
                            }}
                            className="p-2 bg-purple-600 hover:bg-purple-700 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                            title="Download Receipt"
                          >
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                        )}
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Expanded View */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-gray-500 text-xs mb-1 font-medium">USDC Amount</div>
                          <div className="text-white text-sm font-semibold">
                            ${order.amount_in_usdc.toFixed(2)}
                          </div>
                        </div>

                        <div>
                          <div className="text-gray-500 text-xs mb-1 font-medium">Date</div>
                          <div className="text-white text-sm font-semibold">
                            {formatDate(order.created_at, order.local_currency)}
                          </div>
                        </div>
                      </div>

                      {/* Hidden Download Button for non-Pretium orders */}
                      {isSuccess && !order.pretium_transaction_code && (
                        <div className="hidden">
                          <div id={`download-${order.id}`}>
                            <DownloadButton
                              orderData={convertOrderToOrderData(order)}
                              variant="secondary"
                              size="sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
                  className="bg-white/5 hover:bg-white/[0.07] rounded-2xl p-3.5 border border-white/10 hover:border-purple-500/30 cursor-pointer transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-bold text-sm mb-1 leading-none">{formatDate(date)}</p>
                      <p className="text-gray-400 text-[10px] font-medium">
                        {orders.length} transactions • {successfulOrders.length} completed
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-purple-400 font-bold text-sm leading-none">${totalUSDC.toFixed(2)}</p>
                        <p className="text-gray-500 text-[10px] font-medium">total volume</p>
                      </div>
                      <svg className="w-5 h-5 text-purple-400 group-hover:translate-x-1 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
