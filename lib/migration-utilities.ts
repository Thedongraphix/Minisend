/**
 * Migration utilities for transitioning from FID-based to wallet-based analytics
 * These utilities help link existing PostHog data and Supabase records
 */

import { supabase } from '@/lib/supabase/config';
import { posthog } from './analytics';

interface FIDMigrationResult {
  success: boolean;
  message: string;
  linkedUsers: number;
  errors: string[];
}

/**
 * Migrate existing FID-based analytics to wallet-based system
 * This function helps link existing user data with wallet addresses
 */
export async function migrateFIDToWalletAnalytics(): Promise<FIDMigrationResult> {
  const result: FIDMigrationResult = {
    success: false,
    message: '',
    linkedUsers: 0,
    errors: []
  };

  try {

    // Get all orders with wallet addresses that don't have user_id linked
    const { data: ordersWithWallets, error: ordersError } = await supabase
      .from('orders')
      .select('wallet_address, reference_id, created_at')
      .not('wallet_address', 'is', null);

    if (ordersError) {
      result.errors.push(`Failed to fetch orders: ${ordersError.message}`);
      return result;
    }

    const uniqueWallets = [...new Set(ordersWithWallets.map(order => order.wallet_address))];

    for (const walletAddress of uniqueWallets) {
      try {
        // Check if user already exists for this wallet
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('wallet_address', walletAddress)
          .single();

        if (!existingUser) {
          // Create new user record for this wallet
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              wallet_address: walletAddress,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (createError) {
            result.errors.push(`Failed to create user for wallet ${walletAddress}: ${createError.message}`);
            continue;
          }

          // Update orders to link with new user
          const { error: updateError } = await supabase
            .from('orders')
            .update({ user_id: newUser.id })
            .eq('wallet_address', walletAddress);

          if (updateError) {
            result.errors.push(`Failed to update orders for wallet ${walletAddress}: ${updateError.message}`);
            continue;
          }

          result.linkedUsers++;
        }
      } catch (error) {
        result.errors.push(`Error processing wallet ${walletAddress}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    result.success = result.errors.length === 0;
    result.message = result.success
      ? `Successfully linked ${result.linkedUsers} wallets with user records`
      : `Completed with ${result.errors.length} errors. Linked ${result.linkedUsers} wallets.`;

    return result;

  } catch (error) {
    result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

/**
 * Create PostHog aliases to link FID-based and wallet-based identities
 * This helps preserve historical analytics data
 */
export function createPostHogAliases(walletAddress: string, fid: number): void {
  if (typeof window !== 'undefined' && posthog) {
    try {
      // Create alias linking FID-based ID to wallet address
      posthog.alias(`fid:${fid}`, walletAddress);

      console.log(`Created PostHog alias: fid:${fid} -> ${walletAddress}`);
    } catch (error) {
      console.error('Failed to create PostHog alias:', error);
    }
  }
}

/**
 * Batch process multiple FID to wallet links
 */
export async function batchLinkFIDsToWallets(links: Array<{ walletAddress: string; fid: number }>): Promise<FIDMigrationResult> {
  const result: FIDMigrationResult = {
    success: false,
    message: '',
    linkedUsers: 0,
    errors: []
  };

  try {

    for (const { walletAddress, fid } of links) {
      try {
        // Update user record with FID
        const { error: updateError } = await supabase
          .from('users')
          .update({
            fid,
            updated_at: new Date().toISOString()
          })
          .eq('wallet_address', walletAddress);

        if (updateError) {
          result.errors.push(`Failed to link FID ${fid} to wallet ${walletAddress}: ${updateError.message}`);
          continue;
        }

        // Create PostHog alias
        createPostHogAliases(walletAddress, fid);

        result.linkedUsers++;

      } catch (error) {
        result.errors.push(`Error linking FID ${fid} to wallet ${walletAddress}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    result.success = result.errors.length === 0;
    result.message = result.success
      ? `Successfully linked ${result.linkedUsers} FIDs with wallets`
      : `Completed with ${result.errors.length} errors. Linked ${result.linkedUsers} FIDs.`;

    return result;

  } catch (error) {
    result.errors.push(`Batch linking failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

/**
 * Get analytics summary comparing FID-based vs wallet-based tracking
 */
export async function getAnalyticsMigrationSummary() {
  try {

    // Get users with FIDs
    const { data: usersWithFIDs, error: fidError } = await supabase
      .from('users')
      .select('*')
      .not('fid', 'is', null);

    // Get users without FIDs
    const { data: usersWithoutFIDs, error: noFidError } = await supabase
      .from('users')
      .select('*')
      .is('fid', null);

    // Get analytics events
    const { data: analyticsEvents, error: eventsError } = await supabase
      .from('analytics_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (fidError || noFidError || eventsError) {
      console.error('Error fetching migration summary:', { fidError, noFidError, eventsError });
      return null;
    }

    return {
      usersWithFIDs: usersWithFIDs?.length || 0,
      usersWithoutFIDs: usersWithoutFIDs?.length || 0,
      totalUsers: (usersWithFIDs?.length || 0) + (usersWithoutFIDs?.length || 0),
      recentAnalyticsEvents: analyticsEvents?.length || 0,
      migrationProgress: {
        linked: usersWithFIDs?.length || 0,
        unlinked: usersWithoutFIDs?.length || 0,
        percentage: Math.round(((usersWithFIDs?.length || 0) / Math.max((usersWithFIDs?.length || 0) + (usersWithoutFIDs?.length || 0), 1)) * 100)
      }
    };

  } catch (error) {
    console.error('Error in getAnalyticsMigrationSummary:', error);
    return null;
  }
}

/**
 * Validate wallet analytics implementation
 */
export async function validateWalletAnalytics(walletAddress: string): Promise<{
  isValid: boolean;
  checks: Record<string, boolean>;
  errors: string[];
}> {
  const result = {
    isValid: false,
    checks: {
      userExists: false,
      postHogIdentified: false,
      analyticsTracking: false,
      supabaseConnection: false
    },
    errors: [] as string[]
  };

  try {
    // Check if user exists in Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (userError) {
      result.errors.push(`User lookup failed: ${userError.message}`);
    } else if (userData) {
      result.checks.userExists = true;
    }

    // Check PostHog identification
    if (typeof window !== 'undefined' && posthog) {
      const currentDistinctId = posthog.get_distinct_id();
      result.checks.postHogIdentified = currentDistinctId === walletAddress;

      if (!result.checks.postHogIdentified) {
        result.errors.push(`PostHog distinct_id mismatch: expected ${walletAddress}, got ${currentDistinctId}`);
      }
    } else {
      result.errors.push('PostHog not available (server-side or not initialized)');
    }

    // Check if analytics events are being tracked
    const { data: recentEvents, error: eventsError } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('wallet_address', walletAddress)
      .order('created_at', { ascending: false })
      .limit(1);

    if (eventsError) {
      result.errors.push(`Analytics events check failed: ${eventsError.message}`);
    } else {
      result.checks.analyticsTracking = recentEvents && recentEvents.length > 0;

      if (!result.checks.analyticsTracking) {
        result.errors.push('No recent analytics events found for wallet');
      }
    }

    // Check Supabase connection
    const { error: connectionError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    result.checks.supabaseConnection = !connectionError;
    if (connectionError) {
      result.errors.push(`Supabase connection failed: ${connectionError.message}`);
    }

    result.isValid = Object.values(result.checks).every(check => check);

    return result;

  } catch (error) {
    result.errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}