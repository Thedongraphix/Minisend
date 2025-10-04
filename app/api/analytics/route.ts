import { NextResponse } from 'next/server';

const PAYCREST_API_URL = process.env.PAYCREST_BASE_URL;
const PAYCREST_API_KEY = process.env.PAYCREST_API_KEY;
const ANALYTICS_PASSWORD = process.env.ANALYTICS_PASSWORD;

// Server-side cache with 5-minute TTL
interface CachedAnalyticsData {
  success: boolean;
  analytics: ReturnType<typeof processRevenueAnalytics>;
  timestamp: string;
  cached: boolean;
}

let cachedAnalytics: CachedAnalyticsData | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// PayCrest order interface
interface PayCrestOrder {
  id: string;
  amount: string;
  token?: string;
  status: string;
  network?: string;
  createdAt?: string;
  updatedAt?: string;
  returnAddress?: string;
  senderFee?: number;
  transactionFee?: number;
  recipient?: {
    currency?: string;
    accountName?: string;
    accountIdentifier?: string;
  };
}

export async function GET(request: Request) {
  try {
    // Check for password authentication
    const authHeader = request.headers.get('authorization');
    const providedPassword = authHeader?.replace('Bearer ', '');

    if (!ANALYTICS_PASSWORD || providedPassword !== ANALYTICS_PASSWORD) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!PAYCREST_API_KEY || !PAYCREST_API_URL) {
      return NextResponse.json(
        { error: 'API configuration missing' },
        { status: 500 }
      );
    }

    const now = Date.now();

    // Return cached data if fresh
    if (cachedAnalytics && (now - cacheTimestamp) < CACHE_TTL) {
      const cacheAge = Math.floor((now - cacheTimestamp) / 1000);

      return NextResponse.json({
        ...cachedAnalytics,
        cached: true,
        cacheAge: `${cacheAge}s`,
        cacheExpiresIn: `${Math.floor((CACHE_TTL - (now - cacheTimestamp)) / 1000)}s`
      });
    }

    // Fetch all orders from PayCrest API
    const allOrders = await fetchAllOrdersParallel();

    // Process revenue analytics
    const analytics = processRevenueAnalytics(allOrders);

    // Cache the result
    cachedAnalytics = {
      success: true,
      analytics,
      timestamp: new Date().toISOString(),
      cached: false
    };
    cacheTimestamp = now;

    return NextResponse.json(cachedAnalytics);

  } catch (error) {
    console.error('Error generating analytics:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate analytics' },
      { status: 500 }
    );
  }
}

// Parallel pagination for faster data fetching from PayCrest
async function fetchAllOrdersParallel(): Promise<PayCrestOrder[]> {
  // Fetch first page to get total count
  const firstPageResponse = await fetch(`${PAYCREST_API_URL}/sender/orders?page=1&pageSize=100`, {
    headers: {
      'API-Key': PAYCREST_API_KEY!,
      'Content-Type': 'application/json',
    }
  });

  if (!firstPageResponse.ok) {
    const errorText = await firstPageResponse.text();
    throw new Error(`PayCrest API error: ${firstPageResponse.status} - ${errorText}`);
  }

  const firstPageData = await firstPageResponse.json();

  if (firstPageData.status !== 'success') {
    throw new Error(`PayCrest API failed: ${firstPageData.message}`);
  }

  const totalOrders = firstPageData.data?.total || 0;
  const totalPages = Math.ceil(totalOrders / 100);
  const allOrders = firstPageData.data?.orders || [];

  if (totalPages > 1) {
    // Fetch remaining pages in parallel (max 5 concurrent requests)
    const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
    const batchSize = 5;

    for (let i = 0; i < remainingPages.length; i += batchSize) {
      const batch = remainingPages.slice(i, i + batchSize);
      const batchPromises = batch.map(page =>
        fetch(`${PAYCREST_API_URL}/sender/orders?page=${page}&pageSize=100`, {
          headers: {
            'API-Key': PAYCREST_API_KEY!,
            'Content-Type': 'application/json',
          }
        })
          .then(res => res.json())
          .then(data => data.data?.orders || [])
      );

      const batchOrders = await Promise.all(batchPromises);
      allOrders.push(...batchOrders.flat());
    }
  }

  return allOrders;
}

function processRevenueAnalytics(orders: PayCrestOrder[]) {
  // Filter completed orders only (settled status in PayCrest)
  const completedOrders = orders.filter(order =>
    order.status === 'settled'
  );

  // Calculate total revenue from sender fees
  const totalRevenue = completedOrders.reduce((sum, order) => {
    const fee = typeof order.senderFee === 'number' ? order.senderFee : parseFloat(String(order.senderFee || 0));
    return sum + fee;
  }, 0);

  const totalTransactions = completedOrders.length;
  const averageFeePerTx = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // Calculate time-based metrics
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const todayRevenue = completedOrders
    .filter(o => o.createdAt && new Date(o.createdAt) >= today)
    .reduce((sum, o) => {
      const fee = typeof o.senderFee === 'number' ? o.senderFee : parseFloat(String(o.senderFee || 0));
      return sum + fee;
    }, 0);

  const weekRevenue = completedOrders
    .filter(o => o.createdAt && new Date(o.createdAt) >= weekAgo)
    .reduce((sum, o) => {
      const fee = typeof o.senderFee === 'number' ? o.senderFee : parseFloat(String(o.senderFee || 0));
      return sum + fee;
    }, 0);

  const monthRevenue = completedOrders
    .filter(o => o.createdAt && new Date(o.createdAt) >= monthAgo)
    .reduce((sum, o) => {
      const fee = typeof o.senderFee === 'number' ? o.senderFee : parseFloat(String(o.senderFee || 0));
      return sum + fee;
    }, 0);

  // Revenue by currency
  const revenueByCurrency = {
    KES: {
      total: 0,
      count: 0,
      avgFee: 0
    },
    NGN: {
      total: 0,
      count: 0,
      avgFee: 0
    }
  };

  completedOrders.forEach(order => {
    const fee = typeof order.senderFee === 'number' ? order.senderFee : parseFloat(String(order.senderFee || 0));
    const currency = order.recipient?.currency;

    if (currency === 'KES' || currency === 'NGN') {
      revenueByCurrency[currency].total += fee;
      revenueByCurrency[currency].count += 1;
    }
  });

  // Calculate averages
  revenueByCurrency.KES.avgFee = revenueByCurrency.KES.count > 0
    ? revenueByCurrency.KES.total / revenueByCurrency.KES.count
    : 0;
  revenueByCurrency.NGN.avgFee = revenueByCurrency.NGN.count > 0
    ? revenueByCurrency.NGN.total / revenueByCurrency.NGN.count
    : 0;

  // Daily revenue breakdown (last 30 days)
  const dailyRevenue: { date: string; revenue: number; txCount: number; avgFee: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

    const dayOrders = completedOrders.filter(o => {
      if (!o.createdAt) return false;
      const orderDate = new Date(o.createdAt);
      return orderDate >= date && orderDate < nextDate;
    });

    const dayRevenue = dayOrders.reduce((sum, o) => {
      const fee = typeof o.senderFee === 'number' ? o.senderFee : parseFloat(String(o.senderFee || 0));
      return sum + fee;
    }, 0);
    const dayCount = dayOrders.length;

    dailyRevenue.push({
      date: date.toISOString().split('T')[0],
      revenue: dayRevenue,
      txCount: dayCount,
      avgFee: dayCount > 0 ? dayRevenue / dayCount : 0
    });
  }

  // Calculate growth (compare last 7 days vs previous 7 days)
  const previousWeekStart = new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000);
  const previousWeekRevenue = completedOrders
    .filter(o => {
      if (!o.createdAt) return false;
      const date = new Date(o.createdAt);
      return date >= previousWeekStart && date < weekAgo;
    })
    .reduce((sum, o) => {
      const fee = typeof o.senderFee === 'number' ? o.senderFee : parseFloat(String(o.senderFee || 0));
      return sum + fee;
    }, 0);

  const revenueGrowth = previousWeekRevenue > 0
    ? ((weekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100
    : 0;

  return {
    summary: {
      totalRevenue: Number(totalRevenue.toFixed(6)),
      totalTransactions,
      averageFeePerTx: Number(averageFeePerTx.toFixed(6)),
      revenueByPeriod: {
        today: Number(todayRevenue.toFixed(6)),
        week: Number(weekRevenue.toFixed(6)),
        month: Number(monthRevenue.toFixed(6)),
        allTime: Number(totalRevenue.toFixed(6))
      },
      revenueByCurrency: {
        KES: {
          total: Number(revenueByCurrency.KES.total.toFixed(6)),
          count: revenueByCurrency.KES.count,
          avgFee: Number(revenueByCurrency.KES.avgFee.toFixed(6))
        },
        NGN: {
          total: Number(revenueByCurrency.NGN.total.toFixed(6)),
          count: revenueByCurrency.NGN.count,
          avgFee: Number(revenueByCurrency.NGN.avgFee.toFixed(6))
        }
      },
      growthMetrics: {
        revenueGrowth: Number(revenueGrowth.toFixed(1))
      }
    },
    dailyRevenue,
    orders: completedOrders.map(order => ({
      id: order.id,
      paycrest_order_id: order.id,
      wallet_address: order.returnAddress || 'Unknown',
      amount_in_usdc: parseFloat(order.amount),
      amount_in_local: 0, // Not available from PayCrest API directly
      local_currency: order.recipient?.currency || 'Unknown',
      sender_fee: typeof order.senderFee === 'number' ? order.senderFee : parseFloat(String(order.senderFee || 0)),
      transaction_fee: typeof order.transactionFee === 'number' ? order.transactionFee : parseFloat(String(order.transactionFee || 0)),
      status: order.status,
      created_at: order.createdAt || new Date().toISOString(),
      phone_number: order.recipient?.accountIdentifier,
      account_number: order.recipient?.accountIdentifier,
      account_name: order.recipient?.accountName
    }))
  };
}
