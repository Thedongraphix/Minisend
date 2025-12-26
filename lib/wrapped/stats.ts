import { supabaseAdmin } from '@/lib/supabase/config';

export interface WrappedStats {
  walletAddress: string;
  hasTransactions: boolean;

  // Card 1: Total Impact
  totalTransactions: number;
  totalUsdcSent: number;

  // Card 2: Money Received
  totalReceived: {
    KES: number;
    NGN: number;
    GHS: number;
  };
  currencyBreakdown: Array<{
    currency: string;
    amount: number;
    count: number;
  }>;

  // Card 3: Biggest Win
  biggestTransaction: {
    usdcAmount: number;
    localAmount: number;
    currency: string;
    date: string;
  };

  // Card 4: Favorite Method
  favoriteCurrency: string;
  favoritePaymentMethod: string;
  currencyUsagePercent: number;

  // Card 5: Journey
  memberSince: string;
  daysActive: number;
  firstTransactionDate: string;
  mostActiveMonth: string;

  // Card 6: Community Rank
  rank: number;
  totalUsers: number;
  percentile: number;
}

interface RawTransaction {
  wallet_address: string;
  amount_in_usdc: number;
  amount_in_local: number;
  local_currency: string;
  created_at: string;
  status: string;
  payment_type?: string;
  phone_number?: string;
  till_number?: string;
  paybill_number?: string;
  account_number?: string;
  payment_provider?: string;
}

export async function calculateWrappedStats(walletAddress: string): Promise<WrappedStats> {
  try {
    // Fetch completed transactions from both PayCrest and Pretium with timeout protection
    const fetchPromises = [
      fetchPaycrestOrders(walletAddress),
      fetchPretiumOrders(walletAddress),
    ];

    // Add timeout wrapper (10 seconds max)
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Data fetch timeout')), 10000)
    );

    const [paycrestOrders, pretiumOrders] = await Promise.race([
      Promise.all(fetchPromises),
      timeoutPromise
    ]) as [RawTransaction[], RawTransaction[]];

    const allTransactions = [...paycrestOrders, ...pretiumOrders];

    if (allTransactions.length === 0) {
      return createEmptyStats(walletAddress);
    }

  // Calculate all metrics
  const totalTransactions = allTransactions.length;
  const totalUsdcSent = allTransactions.reduce((sum, tx) => sum + tx.amount_in_usdc, 0);

  // Money received by currency
  const totalReceived = {
    KES: 0,
    NGN: 0,
    GHS: 0,
  };

  const currencyCount: Record<string, number> = {};

  allTransactions.forEach((tx) => {
    const currency = tx.local_currency as 'KES' | 'NGN' | 'GHS';
    if (currency in totalReceived) {
      totalReceived[currency] += tx.amount_in_local;
      currencyCount[currency] = (currencyCount[currency] || 0) + 1;
    }
  });

  const currencyBreakdown = Object.entries(totalReceived)
    .filter(([, amount]) => amount > 0)
    .map(([currency, amount]) => ({
      currency,
      amount,
      count: currencyCount[currency] || 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Biggest transaction
  const biggestTx = allTransactions.reduce((max, tx) =>
    tx.amount_in_usdc > max.amount_in_usdc ? tx : max
  );

  const biggestTransaction = {
    usdcAmount: biggestTx.amount_in_usdc,
    localAmount: biggestTx.amount_in_local,
    currency: biggestTx.local_currency,
    date: biggestTx.created_at,
  };

  // Favorite currency (most used)
  const favoriteCurrency = currencyBreakdown[0]?.currency || 'KES';
  const favoriteCurrencyCount = currencyCount[favoriteCurrency] || 0;
  const currencyUsagePercent = Math.round((favoriteCurrencyCount / totalTransactions) * 100);

  // Favorite payment method
  const favoritePaymentMethod = determineFavoritePaymentMethod(allTransactions);

  // Journey stats
  const sortedByDate = [...allTransactions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const firstTransactionDate = sortedByDate[0].created_at;
  const memberSince = formatMemberSince(firstTransactionDate);
  const daysActive = calculateDaysActive(firstTransactionDate);
  const mostActiveMonth = calculateMostActiveMonth(allTransactions);

    // Community rank
    const { rank, totalUsers, percentile } = await calculateCommunityRank(walletAddress);

    return {
      walletAddress,
      hasTransactions: true,
      totalTransactions,
      totalUsdcSent,
      totalReceived,
      currencyBreakdown,
      biggestTransaction,
      favoriteCurrency,
      favoritePaymentMethod,
      currencyUsagePercent,
      memberSince,
      daysActive,
      firstTransactionDate,
      mostActiveMonth,
      rank,
      totalUsers,
      percentile,
    };
  } catch (error) {
    console.error('Error calculating wrapped stats:', error);
    // Return empty stats on error to prevent complete failure
    return createEmptyStats(walletAddress);
  }
}

async function fetchPaycrestOrders(walletAddress: string): Promise<RawTransaction[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('wallet_address, amount_in_usdc, amount_in_local, local_currency, created_at, status, phone_number, account_number, till_number, paybill_number, payment_provider')
      .eq('wallet_address', walletAddress)
      .in('status', ['completed', 'settled', 'fulfilled'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching PayCrest orders:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('PayCrest fetch exception:', error);
    return [];
  }
}

async function fetchPretiumOrders(walletAddress: string): Promise<RawTransaction[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('pretium_orders')
      .select('wallet_address, amount_in_usdc, amount_in_local, local_currency, created_at, status, payment_type, phone_number, account_number, till_number, paybill_number')
      .eq('wallet_address', walletAddress)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching Pretium orders:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Pretium fetch exception:', error);
    return [];
  }
}

function determineFavoritePaymentMethod(transactions: RawTransaction[]): string {
  const methodCounts: Record<string, number> = {};

  transactions.forEach((tx) => {
    let method = 'Mobile Money';

    // Determine payment method based on available data
    if (tx.payment_type) {
      // Pretium orders have explicit payment_type
      switch (tx.payment_type) {
        case 'MOBILE':
          method = 'M-Pesa Mobile';
          break;
        case 'BUY_GOODS':
          method = 'Till Number';
          break;
        case 'PAYBILL':
          method = 'Paybill';
          break;
        case 'BANK_TRANSFER':
          method = 'Bank Transfer';
          break;
      }
    } else {
      // PayCrest orders - infer from fields
      if (tx.till_number) {
        method = 'Till Number';
      } else if (tx.paybill_number) {
        method = 'Paybill';
      } else if (tx.account_number && tx.local_currency === 'NGN') {
        method = 'Bank Transfer';
      } else if (tx.phone_number && tx.local_currency === 'KES') {
        method = 'M-Pesa Mobile';
      } else if (tx.account_number && tx.local_currency === 'GHS') {
        method = 'Mobile Money';
      }
    }

    methodCounts[method] = (methodCounts[method] || 0) + 1;
  });

  // Return most used method
  const entries = Object.entries(methodCounts);
  if (entries.length === 0) return 'Mobile Money';

  return entries.reduce((max, [method, count]) =>
    count > (methodCounts[max] || 0) ? method : max
  , entries[0][0]);
}

function formatMemberSince(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function calculateDaysActive(firstTransactionDate: string): number {
  const first = new Date(firstTransactionDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - first.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function calculateMostActiveMonth(transactions: RawTransaction[]): string {
  const monthCounts: Record<string, number> = {};

  transactions.forEach((tx) => {
    const date = new Date(tx.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
  });

  const entries = Object.entries(monthCounts);
  if (entries.length === 0) return 'N/A';

  const mostActiveMonthKey = entries.reduce((max, [month, count]) =>
    count > (monthCounts[max] || 0) ? month : max
  , entries[0][0]);

  // Format as "Jan 2025"
  const [year, month] = mostActiveMonthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

async function calculateCommunityRank(
  walletAddress: string
): Promise<{ rank: number; totalUsers: number; percentile: number }> {
  try {
    // Get all unique users with their total USDC volume with timeout
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Rank calculation timeout')), 5000)
    );

    const fetchRankData = async () => {
      const [paycrestResult, pretiumResult] = await Promise.all([
        supabaseAdmin
          .from('orders')
          .select('wallet_address, amount_in_usdc')
          .in('status', ['completed', 'settled', 'fulfilled']),
        supabaseAdmin
          .from('pretium_orders')
          .select('wallet_address, amount_in_usdc')
          .eq('status', 'completed')
      ]);

      return { paycrestResult, pretiumResult };
    };

    const { paycrestResult, pretiumResult } = await Promise.race([
      fetchRankData(),
      timeoutPromise
    ]);

    const allOrders = [...(paycrestResult.data || []), ...(pretiumResult.data || [])];

    // Aggregate by wallet address
    const volumeByWallet: Record<string, number> = {};
    allOrders.forEach((order) => {
      volumeByWallet[order.wallet_address] = (volumeByWallet[order.wallet_address] || 0) + order.amount_in_usdc;
    });

    // Sort by volume descending
    const sortedWallets = Object.entries(volumeByWallet)
      .sort(([, a], [, b]) => b - a);

    const totalUsers = sortedWallets.length;
    const userRank = sortedWallets.findIndex(([addr]) => addr === walletAddress) + 1;
    const percentile = totalUsers > 0 ? Math.round((userRank / totalUsers) * 100) : 0;

    return {
      rank: userRank || totalUsers,
      totalUsers,
      percentile,
    };
  } catch (error) {
    console.error('Error calculating community rank:', error);
    // Return safe defaults on error
    return {
      rank: 1,
      totalUsers: 1,
      percentile: 100,
    };
  }
}

function createEmptyStats(walletAddress: string): WrappedStats {
  return {
    walletAddress,
    hasTransactions: false,
    totalTransactions: 0,
    totalUsdcSent: 0,
    totalReceived: { KES: 0, NGN: 0, GHS: 0 },
    currencyBreakdown: [],
    biggestTransaction: {
      usdcAmount: 0,
      localAmount: 0,
      currency: 'KES',
      date: new Date().toISOString(),
    },
    favoriteCurrency: 'KES',
    favoritePaymentMethod: 'Mobile Money',
    currencyUsagePercent: 0,
    memberSince: 'N/A',
    daysActive: 0,
    firstTransactionDate: new Date().toISOString(),
    mostActiveMonth: 'N/A',
    rank: 0,
    totalUsers: 0,
    percentile: 0,
  };
}
