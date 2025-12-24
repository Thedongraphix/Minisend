#!/usr/bin/env tsx
/**
 * Backfill Farcaster User Profiles Script
 *
 * This script fetches Farcaster user profiles for all FIDs in the orders table
 * that don't have profile data in the farcaster_users table.
 *
 * It uses the Neynar API to fetch bulk user data efficiently.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load from both .env.local and .env
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const neynarApiKey = process.env.NEYNAR_API_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

if (!neynarApiKey) {
  console.error('❌ Missing NEYNAR_API_KEY');
  console.error('Please add NEYNAR_API_KEY to your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface FarcasterUser {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  wallet_address: string;
}

/**
 * Fetch user data from Neynar API
 */
async function fetchUserDataFromNeynar(fids: number[]): Promise<Map<number, FarcasterUser>> {
  const userMap = new Map<number, FarcasterUser>();

  // Neynar API allows up to 100 FIDs per request
  const batchSize = 100;
  for (let i = 0; i < fids.length; i += batchSize) {
    const batch = fids.slice(i, i + batchSize);
    console.log(`📡 Fetching user data for ${batch.length} FIDs (batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(fids.length / batchSize)})...`);

    try {
      const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${batch.join(',')}`, {
        headers: {
          'accept': 'application/json',
          'api_key': neynarApiKey!
        }
      });

      if (!response.ok) {
        console.error(`❌ Neynar API error (${response.status}):`, await response.text());
        continue;
      }

      const data = await response.json();

      if (data.users && Array.isArray(data.users)) {
        for (const user of data.users) {
          // Get wallet address (custody address or verified address)
          const walletAddress = user.custody_address || user.verified_addresses?.eth_addresses?.[0] || null;

          if (!walletAddress) {
            console.warn(`⚠️  FID ${user.fid} has no wallet address, skipping`);
            continue;
          }

          userMap.set(user.fid, {
            fid: user.fid,
            username: user.username,
            display_name: user.display_name || user.username,
            pfp_url: user.pfp_url || '',
            wallet_address: walletAddress
          });
        }
      }

      // Rate limiting: wait 1 second between batches
      if (i + batchSize < fids.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`❌ Error fetching batch:`, error);
    }
  }

  return userMap;
}

/**
 * Get FIDs from orders that don't have profiles
 */
async function getMissingFIDs(): Promise<Array<{ fid: number; wallet_address: string }>> {
  console.log('🔍 Finding FIDs with orders but no profile data...');

  const { data, error } = await supabase
    .from('orders')
    .select('fid, wallet_address')
    .not('fid', 'is', null);

  if (error) {
    console.error('❌ Error fetching orders:', error);
    return [];
  }

  if (!data || data.length === 0) {
    console.log('No orders with FIDs found');
    return [];
  }

  // Get unique FID-wallet combinations
  const fidWalletMap = new Map<number, string>();
  for (const order of data) {
    if (order.fid && order.wallet_address) {
      fidWalletMap.set(order.fid, order.wallet_address);
    }
  }

  // Check which ones are missing profiles
  const { data: existingProfiles } = await supabase
    .from('farcaster_users')
    .select('fid');

  const existingFIDs = new Set(existingProfiles?.map(p => p.fid) || []);

  const missingFIDs = Array.from(fidWalletMap.entries())
    .filter(([fid]) => !existingFIDs.has(fid))
    .map(([fid, wallet_address]) => ({ fid, wallet_address }));

  console.log(`Found ${missingFIDs.length} FIDs missing profiles out of ${fidWalletMap.size} total unique FIDs`);

  return missingFIDs;
}

/**
 * Save user profiles to database
 */
async function saveProfiles(users: FarcasterUser[]): Promise<void> {
  console.log(`💾 Saving ${users.length} profiles to database...`);

  const profiles = users.map(user => ({
    fid: user.fid,
    wallet_address: user.wallet_address,
    username: user.username,
    display_name: user.display_name,
    pfp_url: user.pfp_url
  }));

  const { error } = await supabase
    .from('farcaster_users')
    .upsert(profiles, {
      onConflict: 'wallet_address',
      ignoreDuplicates: false
    });

  if (error) {
    console.error('❌ Error saving profiles:', error);
    throw error;
  }

  console.log(`✅ Successfully saved ${users.length} profiles`);
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🚀 FARCASTER PROFILE BACKFILL SCRIPT');
  console.log('═'.repeat(80));
  console.log(`Timestamp: ${new Date().toLocaleString()}\n`);

  try {
    // Step 1: Get FIDs that need profiles
    const missingFIDs = await getMissingFIDs();

    if (missingFIDs.length === 0) {
      console.log('\n✨ All FIDs already have profiles! Nothing to backfill.');
      return;
    }

    console.log(`\n📋 FIDs to fetch: ${missingFIDs.map(m => m.fid).join(', ')}`);

    // Step 2: Fetch user data from Neynar
    const userData = await fetchUserDataFromNeynar(missingFIDs.map(m => m.fid));

    if (userData.size === 0) {
      console.log('\n⚠️  No user data fetched from Neynar');
      return;
    }

    console.log(`✅ Fetched ${userData.size} user profiles from Neynar`);

    // Step 3: Match with wallet addresses from orders
    const usersToSave: FarcasterUser[] = [];
    for (const { fid, wallet_address } of missingFIDs) {
      const neynarUser = userData.get(fid);
      if (neynarUser) {
        // Use wallet address from orders (more reliable than Neynar's custody address)
        usersToSave.push({
          ...neynarUser,
          wallet_address: wallet_address
        });
      } else {
        console.warn(`⚠️  FID ${fid} not found in Neynar response`);
      }
    }

    if (usersToSave.length === 0) {
      console.log('\n⚠️  No valid profiles to save');
      return;
    }

    // Step 4: Save to database
    await saveProfiles(usersToSave);

    // Step 5: Summary
    console.log('\n📊 BACKFILL SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Total FIDs processed: ${missingFIDs.length}`);
    console.log(`Profiles fetched from Neynar: ${userData.size}`);
    console.log(`Profiles saved to database: ${usersToSave.length}`);
    console.log(`Failed: ${missingFIDs.length - usersToSave.length}`);

    console.log('\n✅ Backfill complete!\n');
  } catch (error) {
    console.error('\n❌ Backfill failed:', error);
    process.exit(1);
  }
}

main();
