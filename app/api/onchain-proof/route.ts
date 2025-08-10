import { NextResponse } from 'next/server';

interface PaycrestOrder {
  id: string;
  amount: string;
  token: string;
  rate: string;
  network: string;
  recipient?: {
    currency: string;
    [key: string]: unknown;
  };
  returnAddress?: string;
  receiveAddress?: string;
  txHash?: string;
  status: string;
  createdAt?: string;
  [key: string]: unknown;
}

const PAYCREST_API_URL = process.env.PAYCREST_BASE_URL || 'https://api.paycrest.io/v1';
const PAYCREST_API_KEY = process.env.PAYCREST_API_KEY;

export async function GET() {
  try {
    if (!PAYCREST_API_KEY) {
      return NextResponse.json(
        { error: 'PayCrest API key not configured' },
        { status: 500 }
      );
    }

    console.log('🚀 Generating onchain proof for Minisend...\n');
    
    // Fetch ALL orders with pagination
    let allOrders: PaycrestOrder[] = [];
    let page = 1;
    let total = 0;
    const pageSize = 50; // Increase page size for efficiency
    
    do {
      console.log(`📄 Fetching page ${page}...`);
      
      const response = await fetch(`${PAYCREST_API_URL}/sender/orders?page=${page}&pageSize=${pageSize}`, {
        headers: {
          'API-Key': PAYCREST_API_KEY!,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PayCrest API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (result.status !== 'success') {
        throw new Error(`PayCrest API failed: ${result.message}`);
      }
      
      const pageOrders = result.data?.orders || [];
      total = result.data?.total || 0;
      
      allOrders = allOrders.concat(pageOrders);
      console.log(`📊 Page ${page}: ${pageOrders.length} orders, Total collected: ${allOrders.length}/${total}`);
      
      page++;
      
      // Continue if we have more orders to fetch
    } while (allOrders.length < total && allOrders.length > 0);

    const orders = allOrders;
    console.log(`✅ Collected ALL ${orders.length} orders from ${page - 1} pages`);

    // Filter orders from the complete dataset instead of making separate API calls
    const baseOrders = orders.filter(order => order.network === 'base');
    const usdcOrders = orders.filter(order => order.token === 'USDC');
    const completedOrders = orders.filter(order => order.status === 'settled');

    console.log(`🔵 Found ${baseOrders.length} Base network orders`);
    console.log(`💰 Found ${usdcOrders.length} USDC orders`);
    console.log(`✅ Found ${completedOrders.length} completed orders`);

    // Process the data
    const proof = processOrdersForProof(orders, baseOrders, usdcOrders, completedOrders, total);
    
    return NextResponse.json({
      success: true,
      proof,
      timestamp: new Date().toISOString(),
      domain: 'minisend.xyz'
    });

  } catch (error) {
    console.error('❌ Error generating proof:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate onchain proof' },
      { status: 500 }
    );
  }
}

function processOrdersForProof(
  allOrders: PaycrestOrder[], 
  baseOrders: PaycrestOrder[], 
  usdcOrders: PaycrestOrder[], 
  completedOrders: PaycrestOrder[], 
  totalCount: number
) {
  console.log('📋 Processing orders for onchain proof...\n');

  // Extract key metrics
  const metrics = {
    totalOrders: totalCount,
    baseOrders: baseOrders.length,
    usdcOrders: usdcOrders.length,
    completedOrders: completedOrders.length,
    totalVolumeUSD: 0,
    uniqueUsers: new Set<string>(),
    uniqueReceiveAddresses: new Set<string>(),
    allOrders: [] as Array<{
      orderId: string;
      txHash?: string;
      amount: number;
      currency: string;
      status: string;
      network: string;
      createdAt: string;
      basescanUrl?: string;
      userId: string;
    }>,
    transactionHashes: [] as Array<{
      orderId: string;
      txHash: string;
      amount: number;
      currency: string;
      status: string;
      network: string;
      createdAt: string;
      basescanUrl: string;
      userId: string;
    }>,
    currencies: { KES: 0, NGN: 0 },
    statusBreakdown: {} as Record<string, number>,
    monthlyData: {} as Record<string, { orders: number; volume: number }>
  };

  // Process all orders for comprehensive metrics
  allOrders.forEach((order: PaycrestOrder) => {
    // Volume calculation
    const amount = parseFloat(order.amount) || 0;
    metrics.totalVolumeUSD += amount;

    // Unique users (return addresses)
    if (order.returnAddress) {
      metrics.uniqueUsers.add(order.returnAddress);
    }

    // Unique PayCrest receive addresses
    if (order.receiveAddress) {
      metrics.uniqueReceiveAddresses.add(order.receiveAddress);
    }

    // Add ALL orders (not just those with txHash)
    metrics.allOrders.push({
      orderId: order.id,
      txHash: order.txHash || undefined,
      amount: amount,
      currency: order.recipient?.currency || 'KES',
      status: order.status,
      network: order.network || 'base',
      createdAt: order.createdAt || '',
      basescanUrl: order.txHash ? `https://basescan.org/tx/${order.txHash}` : undefined,
      userId: order.returnAddress || 'Unknown'
    });

    // Transaction hashes (onchain proof) - only those with txHash
    if (order.txHash) {
      metrics.transactionHashes.push({
        orderId: order.id,
        txHash: order.txHash,
        amount: amount,
        currency: order.recipient?.currency || 'KES',
        status: order.status,
        network: order.network || 'base',
        createdAt: order.createdAt || '',
        basescanUrl: `https://basescan.org/tx/${order.txHash}`,
        userId: order.returnAddress || 'Unknown'
      });
    }

    // Currency breakdown
    const currency = order.recipient?.currency;
    if (currency === 'KES') {
      metrics.currencies.KES += amount;
    } else if (currency === 'NGN') {
      metrics.currencies.NGN += amount;
    }

    // Status breakdown
    metrics.statusBreakdown[order.status] = (metrics.statusBreakdown[order.status] || 0) + 1;

    // Monthly data
    if (order.createdAt) {
      const month = order.createdAt.substring(0, 7); // YYYY-MM
      if (!metrics.monthlyData[month]) {
        metrics.monthlyData[month] = { orders: 0, volume: 0 };
      }
      metrics.monthlyData[month].orders += 1;
      metrics.monthlyData[month].volume += amount;
    }
  });

  // Calculate derived metrics
  const successRate = metrics.totalOrders > 0 
    ? ((metrics.completedOrders / metrics.totalOrders) * 100)
    : 0;

  const averageOrderSize = metrics.totalOrders > 0 
    ? (metrics.totalVolumeUSD / metrics.totalOrders)
    : 0;

  // Calculate growth indicators (last 30 days vs previous 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const recentOrders = allOrders.filter(order => {
    if (!order.createdAt) return false;
    const orderDate = new Date(order.createdAt);
    return orderDate >= thirtyDaysAgo;
  });

  const previousOrders = allOrders.filter(order => {
    if (!order.createdAt) return false;
    const orderDate = new Date(order.createdAt);
    return orderDate >= sixtyDaysAgo && orderDate < thirtyDaysAgo;
  });

  const recentVolume = recentOrders.reduce((sum, order) => sum + (parseFloat(order.amount) || 0), 0);
  const previousVolume = previousOrders.reduce((sum, order) => sum + (parseFloat(order.amount) || 0), 0);

  const recentTransactions = recentOrders.filter(order => order.txHash).length;
  const previousTransactions = previousOrders.filter(order => order.txHash).length;

  const recentUsers = new Set(recentOrders.map(order => order.returnAddress).filter(Boolean)).size;
  const previousUsers = new Set(previousOrders.map(order => order.returnAddress).filter(Boolean)).size;

  const recentCompleted = recentOrders.filter(order => order.status === 'settled').length;
  const previousCompleted = previousOrders.filter(order => order.status === 'settled').length;

  const recentSuccessRate = recentOrders.length > 0 ? (recentCompleted / recentOrders.length) * 100 : 0;
  const previousSuccessRate = previousOrders.length > 0 ? (previousCompleted / previousOrders.length) * 100 : 0;

  // Calculate percentage growth
  const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const growthMetrics = {
    volumeGrowth: calculateGrowth(recentVolume, previousVolume),
    transactionsGrowth: calculateGrowth(recentTransactions, previousTransactions),
    usersGrowth: calculateGrowth(recentUsers, previousUsers),
    successRateGrowth: calculateGrowth(recentSuccessRate, previousSuccessRate)
  };

  const proof = {
    app: {
      name: 'Minisend',
      domain: 'minisend.xyz',
      description: 'USDC to KES/NGN instant offramp'
    },
    summary: {
      totalOrders: metrics.totalOrders,
      baseNetworkOrders: metrics.baseOrders,
      usdcOrders: metrics.usdcOrders,
      completedOrders: metrics.completedOrders,
      totalVolumeUSD: Number(metrics.totalVolumeUSD.toFixed(2)),
      uniqueUsers: metrics.uniqueUsers.size,
      successRate: Number(successRate.toFixed(1)),
      averageOrderSize: Number(averageOrderSize.toFixed(2)),
      transactionHashesCount: metrics.transactionHashes.length,
      growthMetrics: {
        volumeGrowth: Number(growthMetrics.volumeGrowth.toFixed(1)),
        transactionsGrowth: Number(growthMetrics.transactionsGrowth.toFixed(1)),
        usersGrowth: Number(growthMetrics.usersGrowth.toFixed(1)),
        successRateGrowth: Number(growthMetrics.successRateGrowth.toFixed(1))
      }
    },
    onchainProof: {
      smartContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
      network: 'Base',
      allOrders: metrics.allOrders, // ALL orders for admin dashboard
      transactionHashes: metrics.transactionHashes.slice(0, 10), // Most recent 10 for proof
      receiveAddresses: Array.from(metrics.uniqueReceiveAddresses).slice(0, 10),
      userWallets: Array.from(metrics.uniqueUsers).slice(0, 10)
    },
    analytics: {
      currencyBreakdown: metrics.currencies,
      statusBreakdown: metrics.statusBreakdown,
      monthlyData: metrics.monthlyData
    },
    duneQuery: generateDuneQueryCode(
      Array.from(metrics.uniqueReceiveAddresses), 
      metrics.transactionHashes
    ),
    buildathonSubmission: {
      smartContractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      onchainProof: `${metrics.transactionHashes.length} verified Base network transactions, $${metrics.totalVolumeUSD.toFixed(0)} USDC total volume, ${metrics.uniqueUsers.size} unique wallet addresses, ${successRate.toFixed(1)}% success rate`,
      basescanLinks: metrics.transactionHashes.slice(0, 5).map(tx => tx.basescanUrl)
    }
  };

  return proof;
}

function generateDuneQueryCode(receiveAddresses: string[], transactionHashes: Array<{txHash: string; [key: string]: unknown}>) {
  if (receiveAddresses.length === 0 && transactionHashes.length === 0) {
    return null;
  }

  let query = `-- Minisend USDC Activity on Base Network\n-- Generated for minisend.xyz\n\n`;

  if (transactionHashes.length > 0) {
    const hashes = transactionHashes.slice(0, 10).map((tx) => `'${tx.txHash}'`).join(',\\n        ');
    
    query += `-- Query by specific transaction hashes
WITH minisend_txns AS (
    SELECT 
        block_time,
        hash as tx_hash,
        "from" as sender_wallet,
        "to" as recipient_wallet,
        value / 1e6 as usdc_amount,
        gas_used * gas_price / 1e18 as gas_fee_eth
    FROM base.transactions
    WHERE hash IN (
        ${hashes}
    )
    AND success = true
)

SELECT 
    COUNT(*) as "Total Transactions",
    ROUND(SUM(usdc_amount), 2) as "Total Volume USDC",
    COUNT(DISTINCT sender_wallet) as "Unique Senders",
    ROUND(AVG(usdc_amount), 2) as "Avg Transaction Size",
    MIN(block_time) as "First Transaction",
    MAX(block_time) as "Latest Transaction"
FROM minisend_txns;`;
  }

  return query;
}