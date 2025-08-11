import { NextResponse } from 'next/server';

const PAYCREST_API_URL = process.env.PAYCREST_BASE_URL || 'https://api.paycrest.io/v1';
const PAYCREST_API_KEY = process.env.PAYCREST_API_KEY;

// PayCrest order interface
interface PayCrestOrder {
  id: string;
  amount: string;
  token?: string;
  status: string;
  txHash?: string;
  network?: string;
  createdAt?: string;
  updatedAt?: string;
  settlementTime?: string;
  returnAddress?: string;
  receiveAddress?: string;
  recipient?: {
    currency?: string;
  };
}

interface ProcessedOrder {
  orderId: string;
  txHash?: string;
  amount: number;
  currency: string;
  status: string;
  network: string;
  createdAt?: string;
  settlementTime?: string;
  basescanUrl?: string;
  userId: string;
}

export async function GET() {
  try {
    if (!PAYCREST_API_KEY) {
      return NextResponse.json(
        { error: 'PayCrest API key not configured' },
        { status: 500 }
      );
    }

    console.log('🚀 Generating onchain proof for Minisend...\n');
    
    // Fetch ALL orders with pagination (PayCrest uses pageSize=100 max)
    let allOrders: PayCrestOrder[] = [];
    let currentPage = 1;
    let totalPages = 1;
    
    do {
      const response = await fetch(`${PAYCREST_API_URL}/sender/orders?page=${currentPage}&pageSize=100`, {
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
      allOrders = allOrders.concat(pageOrders);
      
      // Calculate total pages from first response
      if (currentPage === 1) {
        const totalOrders = result.data?.total || 0;
        totalPages = Math.ceil(totalOrders / 100);
        console.log(`📊 Found ${totalOrders} total orders across ${totalPages} pages`);
      }
      
      console.log(`📄 Fetched page ${currentPage}/${totalPages} (${pageOrders.length} orders)`);
      currentPage++;
    } while (currentPage <= totalPages);

    const orders = allOrders;
    console.log(`✅ Successfully fetched ${orders.length} total orders`);

    // Filter orders instead of making additional API calls (more efficient and accurate)
    const baseOrders = orders.filter(order => order.network === 'base');
    const usdcOrders = orders.filter(order => order.token === 'USDC');
    const completedOrders = orders.filter(order => order.status === 'settled');

    console.log(`🔵 Found ${baseOrders.length} Base network orders`);
    console.log(`💰 Found ${usdcOrders.length} USDC orders`);
    console.log(`✅ Found ${completedOrders.length} completed orders`);

    // Process the data
    const proof = processOrdersForProof(orders, baseOrders, usdcOrders, completedOrders);
    
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

function processOrdersForProof(allOrders: PayCrestOrder[], baseOrders: PayCrestOrder[], usdcOrders: PayCrestOrder[], completedOrders: PayCrestOrder[]) {
  console.log('📋 Processing orders for onchain proof...\n');

  // Extract key metrics
  const metrics = {
    totalOrders: allOrders.length,
    baseOrders: baseOrders.length,
    usdcOrders: usdcOrders.length,
    completedOrders: completedOrders.length,
    totalVolumeUSD: 0,
    uniqueUsers: new Set<string>(),
    uniqueReceiveAddresses: new Set<string>(),
    transactionHashes: [] as ProcessedOrder[],
    currencies: { KES: 0, NGN: 0 },
    statusBreakdown: {} as Record<string, number>,
    monthlyData: {} as Record<string, { orders: number; volume: number }>
  };

  // Add allOrders array to metrics
  const allOrdersArray: ProcessedOrder[] = [];

  // Process all orders for comprehensive metrics
  allOrders.forEach(order => {
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
    allOrdersArray.push({
      orderId: order.id,
      txHash: order.txHash,
      amount: amount,
      currency: order.recipient?.currency || 'KES',
      status: order.status,
      network: order.network || 'base',
      createdAt: order.createdAt,
      settlementTime: order.settlementTime || (order.status === 'settled' ? order.updatedAt : undefined),
      basescanUrl: order.txHash ? `https://basescan.org/tx/${order.txHash}` : undefined,
      userId: order.returnAddress || 'Unknown'
    });

    // Transaction hashes (onchain proof)
    if (order.txHash) {
      metrics.transactionHashes.push({
        orderId: order.id,
        txHash: order.txHash,
        amount: amount,
        currency: order.recipient?.currency || 'KES',
        status: order.status,
        network: order.network || 'base',
        createdAt: order.createdAt,
        settlementTime: order.settlementTime || (order.status === 'settled' ? order.updatedAt : undefined),
        basescanUrl: `https://basescan.org/tx/${order.txHash}`,
        userId: order.returnAddress || 'Unknown'
      });
    }

    // Currency breakdown
    const currency = order.recipient?.currency;
    if (currency === 'KES' || currency === 'NGN') {
      metrics.currencies[currency as keyof typeof metrics.currencies] += amount;
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
        volumeGrowth: 0,
        transactionsGrowth: 0,
        usersGrowth: 0,
        successRateGrowth: 0
      }
    },
    onchainProof: {
      smartContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
      network: 'Base',
      transactionHashes: metrics.transactionHashes.slice(0, 10), // Most recent 10
      allOrders: allOrdersArray, // ALL orders for dashboard pagination
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

function generateDuneQueryCode(receiveAddresses: string[], transactionHashes: ProcessedOrder[]) {
  if (receiveAddresses.length === 0 && transactionHashes.length === 0) {
    return null;
  }

  let query = `-- Minisend USDC Activity on Base Network\n-- Generated for minisend.xyz\n\n`;

  if (transactionHashes.length > 0) {
    const hashes = transactionHashes.slice(0, 10).map(tx => `'${tx.txHash}'`).join(',\\n        ');
    
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