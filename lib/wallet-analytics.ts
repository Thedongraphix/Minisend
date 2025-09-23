"use client";

import { posthog } from './analytics';
import { supabase } from '@/lib/supabase/config';

// Types for wallet-based analytics
interface WalletUser {
  id: string;
  wallet_address: string;
  phone_number?: string;
  fid?: number; // Farcaster ID for linking with existing data
  created_at: string;
  updated_at: string;
}

interface WalletAnalyticsEvent {
  event: string;
  wallet_address: string;
  user_id?: string;
  fid?: number; // For linking with existing FID-based data
  timestamp: number;
  properties?: Record<string, unknown>;
}

/**
 * Initialize user session using wallet address as primary identifier
 * This replaces FID-based tracking with wallet-based tracking
 */
export async function initializeWalletSession(
  walletAddress: string,
  context?: { user?: { fid?: number }; client?: { clientFid?: number; added?: boolean } }
): Promise<WalletUser | null> {
  if (!walletAddress) {
    console.log("No wallet address provided");
    return null;
  }

  try {

    // First, try to find existing user by wallet address
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      console.error('Error finding user:', findError);
      return null;
    }

    let user: WalletUser;

    if (existingUser) {
      // Update existing user with FID if provided and not already set
      if (context?.user?.fid && !existingUser.fid) {
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({
            fid: context.user.fid,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUser.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating user with FID:', updateError);
          user = existingUser;
        } else {
          user = updatedUser;
        }
      } else {
        user = existingUser;
      }
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          wallet_address: walletAddress,
          fid: context?.user?.fid,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        return null;
      }

      user = newUser;
    }

    // Initialize PostHog with wallet address as distinct_id
    if (typeof window !== 'undefined' && posthog) {
      const userProperties = {
        wallet_address: walletAddress,
        user_id: user.id,
        fid: user.fid || context?.user?.fid,
        clientFid: context?.client?.clientFid,
        isFrameAdded: context?.client?.added,
        platform: 'farcaster_miniapp',
        app: 'minisend',
        created_at: user.created_at,
        // Link with existing FID-based data if available
        ...(user.fid && { legacy_fid_user: `fid:${user.fid}` })
      };

      posthog.identify(walletAddress, userProperties);

      // If we have both wallet and FID, create an alias to link them
      if (user.fid) {
        posthog.alias(`fid:${user.fid}`, walletAddress);
      }
    }

    // Track session initialization
    await trackWalletEvent('session_start', {
      wallet_address: walletAddress,
      user_id: user.id,
      fid: user.fid,
      clientId: context?.client?.clientFid,
      isFrameAdded: context?.client?.added,
      isNewUser: !existingUser
    });

    console.log(`Wallet session initialized for ${walletAddress} (User ID: ${user.id})`);
    return user;

  } catch (error) {
    console.error('Error initializing wallet session:', error);
    return null;
  }
}

/**
 * Track analytics event with wallet address as primary identifier
 */
export async function trackWalletEvent(
  event: string,
  properties: Record<string, unknown> & {
    wallet_address: string;
    user_id?: string;
    fid?: number;
  }
): Promise<void> {
  const { wallet_address, user_id, fid, ...otherProperties } = properties;

  if (!wallet_address) {
    console.log(`⚠️ Skipping analytics event '${event}' - no wallet address provided`);
    return;
  }

  const analyticsEvent: WalletAnalyticsEvent = {
    event,
    wallet_address,
    user_id,
    fid,
    timestamp: Date.now(),
    properties: otherProperties,
  };

  try {
    // Store in Supabase
    await supabase
      .from('analytics_events')
      .insert({
        user_id,
        wallet_address,
        event_name: event,
        event_data: {
          ...otherProperties,
          fid,
          timestamp: analyticsEvent.timestamp
        },
        created_at: new Date().toISOString()
      });

    // Send to PostHog with wallet address as distinct_id
    if (typeof window !== 'undefined' && posthog) {
      posthog.capture(event, {
        ...otherProperties,
        wallet_address,
        user_id,
        fid,
        timestamp: analyticsEvent.timestamp,
        // Add additional context
        $current_url: window.location.href,
        $referrer: document.referrer,
        platform: 'farcaster_miniapp',
        app: 'minisend',
        tracking_method: 'wallet_based'
      });
    }

    // Log for debugging
    console.log("Wallet Analytics Event:", analyticsEvent);

  } catch (error) {
    console.error('Error tracking wallet event:', error);
  }
}

/**
 * Track payment-related events with wallet context
 */
export async function trackWalletPaymentEvent(
  event: string,
  data: {
    wallet_address: string;
    user_id?: string;
    fid?: number;
    amount?: string;
    currency?: string;
    phoneNumber?: string;
    orderId?: string;
    transactionHash?: string;
    success?: boolean;
    error?: string;
  }
): Promise<void> {
  const { phoneNumber, ...safeData } = data;

  await trackWalletEvent(`payment_${event}`, {
    ...safeData,
    // Sanitize phone number
    phoneNumber: phoneNumber ? phoneNumber.substring(0, 4) + '****' + phoneNumber.substring(phoneNumber.length - 4) : undefined,
  });
}

/**
 * Track wallet connection events
 */
export async function trackWalletConnectionEvent(
  event: string,
  data: {
    wallet_address: string;
    user_id?: string;
    fid?: number;
    walletType?: string;
    success?: boolean;
    error?: string;
  }
): Promise<void> {
  await trackWalletEvent(`wallet_${event}`, data);
}

/**
 * Get user by wallet address with FID linking
 */
export async function getUserByWallet(walletAddress: string): Promise<WalletUser | null> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (error) {
      console.error('Error fetching user by wallet:', error);
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error in getUserByWallet:', error);
    return null;
  }
}

/**
 * Link wallet address with existing FID-based user data
 */
export async function linkWalletWithFID(walletAddress: string, fid: number): Promise<boolean> {
  try {

    // Update user record with FID
    const { error } = await supabase
      .from('users')
      .update({
        fid,
        updated_at: new Date().toISOString()
      })
      .eq('wallet_address', walletAddress);

    if (error) {
      console.error('Error linking wallet with FID:', error);
      return false;
    }

    // Create PostHog alias to link wallet with FID
    if (typeof window !== 'undefined' && posthog) {
      posthog.alias(`fid:${fid}`, walletAddress);
    }

    await trackWalletEvent('wallet_fid_linked', {
      wallet_address: walletAddress,
      fid,
      linked_at: Date.now()
    });

    console.log(`Successfully linked wallet ${walletAddress} with FID ${fid}`);
    return true;

  } catch (error) {
    console.error('Error linking wallet with FID:', error);
    return false;
  }
}

/**
 * Get analytics summary for wallet-based tracking
 */
export async function getWalletAnalyticsSummary(walletAddress?: string) {
  try {

    let query = supabase
      .from('analytics_events')
      .select('*');

    if (walletAddress) {
      query = query.eq('wallet_address', walletAddress);
    }

    const { data: events, error } = await query
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching analytics summary:', error);
      return null;
    }

    return {
      totalEvents: events.length,
      recentEvents: events.slice(0, 10),
      walletAddress,
      summary: 'wallet_based_tracking'
    };

  } catch (error) {
    console.error('Error in getWalletAnalyticsSummary:', error);
    return null;
  }
}

/**
 * Reset wallet session (equivalent to posthog.reset())
 */
export function resetWalletSession(): void {
  if (typeof window !== 'undefined' && posthog) {
    posthog.reset();
  }
}

/**
 * Get current wallet distinct ID
 */
export function getCurrentWalletDistinctId(): string | null {
  if (typeof window !== 'undefined' && posthog) {
    return posthog.get_distinct_id();
  }
  return null;
}