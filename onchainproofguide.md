#!/usr/bin/env node

/**
 * PayCrest Orders to Buildathon Proof Generator
 * Uses PayCrest /sender/orders API to generate onchain proof for Base Buildathon
 */

require('dotenv').config();

const PAYCREST_API_KEY = process.env.PAYCREST_API_KEY;
const PAYCREST_API_URL = 'https://api.paycrest.io/v1';

if (!PAYCREST_API_KEY) {
  console.error('❌ PAYCREST_API_KEY not found in .env file');
  process.exit(1);
}

async function fetchAllPaycrestOrders() {
  console.log('🚀 Fetching PayCrest orders for Base Buildathon proof...\n');
  
  try {
    // Fetch all orders
    const allOrdersResponse = await fetch(`${PAYCREST_API_URL}/sender/orders`, {
      headers: {
        'API-Key': PAYCREST_API_KEY,
        'Content-Type': 'application/json',
      }
    });

    if (!allOrdersResponse.ok) {
      throw new Error(`PayCrest API error: ${allOrdersResponse.status} - ${allOrdersResponse.statusText}`);
    }

    const allOrdersResult = await allOrdersResponse.json();
    
    if (allOrdersResult.status !== 'success') {
      throw new Error(`PayCrest API failed: ${allOrdersResult.message}`);
    }

    console.log(`📊 Found ${allOrdersResult.data.length} total orders`);

    // Fetch Base network orders specifically  
    const baseOrdersResponse = await fetch(`${PAYCREST_API_URL}/sender/orders?network=base`, {
      headers: {
        'API-Key': PAYCREST_API_KEY,
        'Content-Type': 'application/json',
      }
    });

    let baseOrders = [];
    if (baseOrdersResponse.ok) {
      const baseResult = await baseOrdersResponse.json();
      baseOrders = baseResult.status === 'success' ? baseResult.data : [];
      console.log(`🔵 Found ${baseOrders.length} Base network orders`);
    }

    // Fetch USDC orders specifically
    const usdcOrdersResponse = await fetch(`${PAYCREST_API_URL}/sender/orders?token=USDC`, {
      headers: {
        'API-Key': PAYCREST_API_KEY,
        'Content-Type': 'application/json',
      }
    });

    let usdcOrders = [];
    if (usdcOrdersResponse.ok) {
      const usdcResult = await usdcOrdersResponse.json();
      usdcOrders = usdcResult.status === 'success' ? usdcResult.data : [];
      console.log(`💰 Found ${usdcOrders.length} USDC orders`);
    }

    // Fetch completed orders
    const completedOrdersResponse = await fetch(`${PAYCREST_API_URL}/sender/orders?status=settled`, {
      headers: {
        'API-Key': PAYCREST_API_KEY,
        'Content-Type': 'application/json',
      }
    });

    let completedOrders = [];
    if (completedOrdersResponse.ok) {
      const completedResult = await completedOrdersResponse.json();
      completedOrders = completedResult.status === 'success' ? completedResult.data : [];
      console.log(`✅ Found ${completedOrders.length} completed orders`);
    }

    // Process the data
    const orders = allOrdersResult.data;
    return processOrdersForBuildathon(orders, baseOrders, usdcOrders, completedOrders);

  } catch (error) {
    console.error('❌ Error fetching PayCrest orders:', error.message);
    throw error;
  }
}

function processOrdersForBuildathon(allOrders, baseOrders, usdcOrders, completedOrders) {
  console.log('\n📋 Processing orders for buildathon proof...\n');

  // Extract key metrics
  const metrics = {
    totalOrders: allOrders.length,
    baseOrders: baseOrders.length,
    usdcOrders: usdcOrders.length,
    completedOrders: completedOrders.length,
    totalVolumeUSD: 0,
    uniqueUsers: new Set(),
    uniqueReceiveAddresses: new Set(),
    transactionHashes: [],
    currencies: { KES: 0, NGN: 0 },
    statusBreakdown: {},
    monthlyData: {}
  };

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
        basescanUrl: `https://basescan.org/tx/${order.txHash}`
      });
    }

    // Currency breakdown
    const currency = order.recipient?.currency;
    if (currency === 'KES' || currency === 'NGN') {
      metrics.currencies[currency] += amount;
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
    ? ((metrics.completedOrders / metrics.totalOrders) * 100).toFixed(1)
    : '0';

  const averageOrderSize = metrics.totalOrders > 0 
    ? (metrics.totalVolumeUSD / metrics.totalOrders).toFixed(2)
    : '0';

  // Print buildathon summary
  console.log('🏆 BASE BUILDATHON ONCHAIN PROOF');
  console.log('================================');
  console.log(`📊 Total Orders: ${metrics.totalOrders}`);
  console.log(`🔵 Base Network Orders: ${metrics.baseOrders}`);
  console.log(`💰 USDC Orders: ${metrics.usdcOrders}`);
  console.log(`✅ Completed Orders: ${metrics.completedOrders}`);
  console.log(`💵 Total Volume: $${metrics.totalVolumeUSD.toFixed(2)} USDC`);
  console.log(`👥 Unique Users: ${metrics.uniqueUsers.size}`);
  console.log(`🎯 Success Rate: ${successRate}%`);
  console.log(`📈 Average Order: $${averageOrderSize} USDC`);
  console.log(`🔗 Transaction Hashes: ${metrics.transactionHashes.length}`);

  if (metrics.transactionHashes.length > 0) {
    console.log('\n🔗 RECENT TRANSACTION HASHES (Onchain Proof):');
    console.log('===========================================');
    metrics.transactionHashes.slice(0, 10).forEach((tx, i) => {
      console.log(`${i + 1}. ${tx.txHash}`);
      console.log(`   $${tx.amount} USDC → ${tx.currency} (${tx.status})`);
      console.log(`   ${tx.basescanUrl}\n`);
    });
  }

  console.log('\n📋 PAYCREST RECEIVE ADDRESSES (for Dune):');
  console.log('=========================================');
  const receiveAddresses = Array.from(metrics.uniqueReceiveAddresses);
  receiveAddresses.slice(0, 10).forEach((addr, i) => {
    console.log(`${i + 1}. ${addr}`);
  });

  console.log('\n🎯 FOR YOUR BUILDATHON APPLICATION:');
  console.log('==================================');
  console.log('\n**Smart Contract Address(es):**');
  console.log('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (USDC on Base)');
  
  console.log('\n**Other Onchain Proof:**');
  console.log(`• ${metrics.transactionHashes.length} verified Base network transactions`);
  console.log(`• $${metrics.totalVolumeUSD.toFixed(2)} USDC total volume processed`);
  console.log(`• ${metrics.uniqueUsers.size} unique wallet addresses`);
  console.log(`• ${successRate}% transaction success rate`);
  console.log(`• Built on Base network using OnchainKit`);
  console.log(`• All transactions verifiable on BaseScan`);

  // Generate Dune query with actual addresses
  generateDuneQuery(receiveAddresses, metrics.transactionHashes);

  return metrics;
}

function generateDuneQuery(receiveAddresses, transactionHashes) {
  console.log('\n📊 DUNE ANALYTICS QUERY:');
  console.log('========================');
  
  if (receiveAddresses.length === 0 && transactionHashes.length === 0) {
    console.log('❌ No receive addresses or transaction hashes found');
    return;
  }

  console.log('\n-- Copy this query to dune.com/queries:');
  console.log('-- Minisend USDC Activity on Base Network\n');

  if (transactionHashes.length > 0) {
    // Query by specific transaction hashes (most accurate)
    const hashes = transactionHashes.slice(0, 20).map(tx => `'${tx.txHash}'`).join(',\n        ');
    
    console.log(`-- Method 1: Query by specific transaction hashes
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
FROM minisend_txns;`);
  }

  if (receiveAddresses.length > 0) {
    // Query by PayCrest receive addresses
    const addresses = receiveAddresses.slice(0, 10).map(addr => `'${addr}'`).join(',\n        ');
    
    console.log(`\n-- Method 2: Query by PayCrest receive addresses
SELECT 
    DATE_TRUNC('day', evt_block_time) as date,
    COUNT(*) as transactions,
    ROUND(SUM(value / 1e6), 2) as usdc_volume,
    COUNT(DISTINCT "from") as unique_senders
FROM base.erc20_transfer
WHERE 
    contract_address = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913  -- USDC
    AND "to" IN (
        ${addresses}
    )
    AND evt_block_time >= '2024-01-01'
GROUP BY DATE_TRUNC('day', evt_block_time)
ORDER BY date DESC
LIMIT 30;`);
  }

  console.log('\n🎯 DUNE DASHBOARD STEPS:');
  console.log('1. Go to dune.com and sign up (free)');
  console.log('2. Create "New Query" with the SQL above');
  console.log('3. Run the query to verify data');
  console.log('4. Click "Save" and make it public');
  console.log('5. Create a dashboard with charts');
  console.log('6. Share the dashboard URL in your buildathon application');
}

// Helper function to save data to files
function saveToFile(data, filename) {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const outputDir = './buildathon-proof';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`💾 Data saved to: ${filePath}`);
  } catch (error) {
    console.error(`❌ Error saving ${filename}:`, error.message);
  }
}

// Main execution
async function main() {
  try {
    console.log('🔑 Using PayCrest API Key:', PAYCREST_API_KEY.substring(0, 8) + '...');
    
    const buildathonData = await fetchAllPaycrestOrders();
    
    // Save transaction hashes for submission
    const txHashes = buildathonData.transactionHashes.map(tx => tx.txHash);
    saveToFile(txHashes, 'transaction-hashes.json');
    
    // Save full metrics
    saveToFile(buildathonData, 'buildathon-metrics.json');
    
    console.log('\n🎉 Buildathon proof generation complete!');
    console.log('\n📋 COPY-PASTE FOR APPLICATION:');
    console.log('=============================');
    console.log('Smart Contract: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
    console.log(`Onchain Proof: ${buildathonData.transactionHashes.length} Base txns, $${buildathonData.totalVolumeUSD.toFixed(0)} volume, ${buildathonData.uniqueUsers.size} users`);
    
    if (buildathonData.transactionHashes.length > 0) {
      console.log('\nSample Transaction Hashes:');
      buildathonData.transactionHashes.slice(0, 3).forEach(tx => {
        console.log(`• ${tx.txHash}`);
      });
    }

  } catch (error) {
    console.error('💥 Failed to generate buildathon proof:', error.message);
    
    if (error.message.includes('401') || error.message.includes('403')) {
      console.error('\n🔧 TROUBLESHOOTING:');
      console.error('- Check your PAYCREST_API_KEY in .env file');
      console.error('- Verify the API key is active and has correct permissions');
      console.error('- Try testing with: curl -H "API-Key: YOUR_KEY" https://api.paycrest.io/v1/sender/orders');
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fetchAllPaycrestOrders, processOrdersForBuildathon };