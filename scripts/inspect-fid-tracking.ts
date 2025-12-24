#!/usr/bin/env tsx
/**
 * Database Inspection Script for FID Tracking
 *
 * This script inspects all tables related to Farcaster FID tracking:
 * - farcaster_users: User profiles linked to wallets
 * - orders: Orders with associated FIDs
 * - user_notifications: Notification tokens for FID-based notifications
 * - notification_history: History of sent notifications
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load from both .env.local and .env (try local first, fallback to .env)
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectFarcasterUsers() {
  console.log('\n📊 FARCASTER_USERS TABLE');
  console.log('═'.repeat(80));

  const { data, error, count } = await supabase
    .from('farcaster_users')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`Total users: ${count}`);

  if (data && data.length > 0) {
    console.log('\nMost recent users:');
    data.forEach((user, i) => {
      console.log(`\n${i + 1}. FID: ${user.fid}`);
      console.log(`   Username: @${user.username || 'N/A'}`);
      console.log(`   Display Name: ${user.display_name || 'N/A'}`);
      console.log(`   Wallet: ${user.wallet_address.substring(0, 10)}...${user.wallet_address.substring(user.wallet_address.length - 8)}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
    });
  } else {
    console.log('No users found');
  }
}

async function inspectOrdersWithFID() {
  console.log('\n\n💰 ORDERS WITH FID');
  console.log('═'.repeat(80));

  const { data, error, count } = await supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .not('fid', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`Total orders with FID: ${count}`);

  if (data && data.length > 0) {
    console.log('\nMost recent orders:');
    data.forEach((order, i) => {
      console.log(`\n${i + 1}. Order ID: ${order.paycrest_order_id || order.id}`);
      console.log(`   FID: ${order.fid}`);
      console.log(`   Amount: ${order.amount_in_usdc} USDC → ${order.amount_in_local} ${order.local_currency}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Wallet: ${order.wallet_address?.substring(0, 10)}...${order.wallet_address?.substring(order.wallet_address.length - 8)}`);
      console.log(`   Created: ${new Date(order.created_at).toLocaleString()}`);
    });
  } else {
    console.log('No orders with FID found');
  }

  // Get summary statistics
  const { data: stats } = await supabase
    .from('orders')
    .select('fid, status')
    .not('fid', 'is', null);

  if (stats && stats.length > 0) {
    const uniqueFIDs = new Set(stats.map(s => s.fid)).size;
    const statusBreakdown = stats.reduce((acc: any, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    console.log(`\n📈 Statistics:`);
    console.log(`   Unique FIDs with orders: ${uniqueFIDs}`);
    console.log(`   Status breakdown:`, statusBreakdown);
  }
}

async function inspectNotifications() {
  console.log('\n\n🔔 USER_NOTIFICATIONS TABLE');
  console.log('═'.repeat(80));

  const { data, error, count } = await supabase
    .from('user_notifications')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`Total notification tokens: ${count}`);

  if (data && data.length > 0) {
    const enabledCount = data.filter(n => n.enabled).length;
    console.log(`Enabled: ${enabledCount} | Disabled: ${count! - enabledCount}`);

    console.log('\nRecent notification registrations:');
    data.slice(0, 5).forEach((notif, i) => {
      console.log(`\n${i + 1}. FID: ${notif.fid}`);
      console.log(`   Enabled: ${notif.enabled ? '✅' : '❌'}`);
      console.log(`   Last sent: ${notif.last_notification_sent_at ? new Date(notif.last_notification_sent_at).toLocaleString() : 'Never'}`);
      console.log(`   Registered: ${new Date(notif.created_at).toLocaleString()}`);
    });
  } else {
    console.log('No notification tokens found');
  }
}

async function inspectNotificationHistory() {
  console.log('\n\n📜 NOTIFICATION_HISTORY TABLE');
  console.log('═'.repeat(80));

  const { data, error, count } = await supabase
    .from('notification_history')
    .select('*', { count: 'exact' })
    .order('sent_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`Total notifications sent: ${count}`);

  if (data && data.length > 0) {
    console.log('\nRecent notifications:');
    data.forEach((notif, i) => {
      console.log(`\n${i + 1}. To FID: ${notif.fid}`);
      console.log(`   Title: ${notif.title}`);
      console.log(`   Body: ${notif.body}`);
      console.log(`   Status: ${notif.status === 'success' ? '✅' : '❌'} ${notif.status}`);
      console.log(`   Sent: ${new Date(notif.sent_at).toLocaleString()}`);
      if (notif.error_message) {
        console.log(`   Error: ${notif.error_message}`);
      }
    });

    // Get summary stats
    const statusBreakdown = data.reduce((acc: any, notif) => {
      acc[notif.status] = (acc[notif.status] || 0) + 1;
      return acc;
    }, {});

    console.log(`\n📊 Status breakdown:`, statusBreakdown);
  } else {
    console.log('No notification history found');
  }
}

async function getFIDAnalytics() {
  console.log('\n\n📊 FID ANALYTICS SUMMARY');
  console.log('═'.repeat(80));

  // Get users with and without orders
  const { data: usersData } = await supabase
    .from('farcaster_users')
    .select('fid, wallet_address, username');

  const { data: ordersData } = await supabase
    .from('orders')
    .select('fid, amount_in_usdc, amount_in_local, local_currency, status')
    .not('fid', 'is', null);

  if (usersData && ordersData) {
    const userFIDs = new Set(usersData.map(u => u.fid));
    const orderFIDs = new Set(ordersData.map(o => o.fid));

    console.log(`Total unique FIDs in farcaster_users table: ${userFIDs.size}`);
    console.log(`Total unique FIDs in orders table: ${orderFIDs.size}`);
    console.log(`⚠️  Missing profiles: ${orderFIDs.size - userFIDs.size} FIDs have orders but no profile data`);

    const usersWithOrders = [...userFIDs].filter(fid => orderFIDs.has(fid)).length;
    const usersWithoutOrders = userFIDs.size - usersWithOrders;

    if (userFIDs.size > 0) {
      console.log(`FIDs with completed orders: ${usersWithOrders} (${((usersWithOrders / userFIDs.size) * 100).toFixed(1)}%)`);
      console.log(`FIDs without orders yet: ${usersWithoutOrders} (${((usersWithoutOrders / userFIDs.size) * 100).toFixed(1)}%)`);
    }

    // Calculate volume by FID and currency
    const fidStats: { [key: number]: { count: number; usdcVolume: number; kesVolume: number; ngnVolume: number; completedCount: number } } = {};

    ordersData.forEach(order => {
      if (order.fid) {
        if (!fidStats[order.fid]) {
          fidStats[order.fid] = { count: 0, usdcVolume: 0, kesVolume: 0, ngnVolume: 0, completedCount: 0 };
        }
        fidStats[order.fid].count++;
        fidStats[order.fid].usdcVolume += parseFloat(order.amount_in_usdc) || 0;

        if (order.local_currency === 'KES') {
          fidStats[order.fid].kesVolume += parseFloat(order.amount_in_local) || 0;
        } else if (order.local_currency === 'NGN') {
          fidStats[order.fid].ngnVolume += parseFloat(order.amount_in_local) || 0;
        }

        if (order.status === 'completed') {
          fidStats[order.fid].completedCount++;
        }
      }
    });

    const topUsersByVolume = Object.entries(fidStats)
      .sort(([, a], [, b]) => b.usdcVolume - a.usdcVolume)
      .slice(0, 5);

    if (topUsersByVolume.length > 0) {
      console.log(`\n💰 Top 5 users by USDC volume:`);
      for (const [fid, stats] of topUsersByVolume) {
        const user = usersData.find(u => u.fid === parseInt(fid));
        const username = user?.username ? `@${user.username}` : 'No profile';
        console.log(`   FID ${fid} (${username}):`);
        console.log(`      ${stats.count} transactions (${stats.completedCount} completed)`);
        console.log(`      ${stats.usdcVolume.toFixed(2)} USDC total`);
        if (stats.kesVolume > 0) console.log(`      ${stats.kesVolume.toFixed(2)} KES`);
        if (stats.ngnVolume > 0) console.log(`      ${stats.ngnVolume.toFixed(2)} NGN`);
      }
    }

    // Currency breakdown
    const currencyStats = ordersData.reduce((acc: any, order) => {
      const currency = order.local_currency || 'Unknown';
      if (!acc[currency]) {
        acc[currency] = { count: 0, totalLocal: 0, totalUSDC: 0 };
      }
      acc[currency].count++;
      acc[currency].totalLocal += parseFloat(order.amount_in_local) || 0;
      acc[currency].totalUSDC += parseFloat(order.amount_in_usdc) || 0;
      return acc;
    }, {});

    console.log(`\n💱 Currency breakdown:`);
    Object.entries(currencyStats).forEach(([currency, stats]: [string, any]) => {
      console.log(`   ${currency}: ${stats.count} orders, ${stats.totalUSDC.toFixed(2)} USDC → ${stats.totalLocal.toFixed(2)} ${currency}`);
    });
  }
}

async function main() {
  console.log('\n🔍 MINISEND FID TRACKING DATABASE INSPECTION');
  console.log('═'.repeat(80));
  console.log(`Timestamp: ${new Date().toLocaleString()}`);

  try {
    await inspectFarcasterUsers();
    await inspectOrdersWithFID();
    await inspectNotifications();
    await inspectNotificationHistory();
    await getFIDAnalytics();

    console.log('\n\n✅ Inspection complete!\n');
  } catch (error) {
    console.error('\n❌ Inspection failed:', error);
    process.exit(1);
  }
}

main();
