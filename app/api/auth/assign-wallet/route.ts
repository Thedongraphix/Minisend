/**
 * API Route: Assign Minisend Wallet
 * Creates or retrieves a BlockRadar wallet for authenticated users
 * Includes rate limiting, validation, and security measures
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  rateLimiter,
  getClientIdentifier,
  validateRequestOrigin,
  logSecurityEvent,
} from '@/lib/utils/security';
import { validateAuthData } from '@/lib/utils/validation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AssignWalletRequest {
  userId: string;
  platform: 'farcaster' | 'baseapp' | 'web';
  walletAddress?: string;
  token?: string;
  email?: string;
}

interface BlockRadarAddressResponse {
  data: {
    id: string;
    address: string;
    blockchain: {
      name: string;
      slug: string;
    };
    metadata?: Record<string, unknown>;
  };
  message: string;
  statusCode: number;
}

/**
 * Verify Farcaster authentication token
 */
async function verifyFarcasterToken(token: string): Promise<boolean> {
  try {
    // TODO: Implement proper Farcaster token verification
    // For now, we'll accept any token from Farcaster context
    return !!token;
  } catch (error) {
    console.error('Farcaster token verification failed:', error);
    return false;
  }
}

/**
 * Create a BlockRadar wallet address
 */
async function createBlockRadarWallet(metadata: Record<string, unknown>): Promise<{ address: string; addressId: string }> {
  const BLOCKRADAR_API_KEY = process.env.BLOCKRADAR_API_KEY;
  const BLOCKRADAR_WALLET_ID = process.env.BLOCKRADAR_WALLET_ID;

  if (!BLOCKRADAR_API_KEY || !BLOCKRADAR_WALLET_ID) {
    throw new Error('BlockRadar credentials not configured');
  }

  try {
    const response = await fetch(
      `https://api.blockradar.co/v1/wallets/${BLOCKRADAR_WALLET_ID}/addresses`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': BLOCKRADAR_API_KEY,
        },
        body: JSON.stringify({
          metadata,
          name: `Minisend User ${metadata.user_id}`,
          disableAutoSweep: true,
          enableGaslessWithdraw: true,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`BlockRadar API error: ${error}`);
    }

    const data: BlockRadarAddressResponse = await response.json();

    return {
      address: data.data.address,
      addressId: data.data.id,
    };
  } catch (error) {
    console.error('Failed to create BlockRadar wallet:', error);
    throw error;
  }
}


/**
 * POST /api/auth/assign-wallet
 * Assigns a Minisend wallet to a user
 */
export async function POST(request: NextRequest) {
  try {
    // Security: Validate request origin
    if (!validateRequestOrigin(request)) {
      logSecurityEvent('invalid_origin', {
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer'),
      });

      return NextResponse.json(
        { error: 'Invalid request origin' },
        { status: 403 }
      );
    }

    // Rate limiting: Prevent abuse
    const clientId = getClientIdentifier(request);
    const rateLimit = rateLimiter.check(clientId, 20, 60000); // 20 requests per minute

    if (!rateLimit.allowed) {
      logSecurityEvent('rate_limit_exceeded', { clientId });

      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
          },
        }
      );
    }

    const body: AssignWalletRequest = await request.json();
    const { userId, platform, walletAddress, token, email } = body;

    // Validate input data
    const validation = validateAuthData({ userId, platform, walletAddress, email, token });
    if (!validation.valid) {
      logSecurityEvent('invalid_auth_data', { errors: validation.errors, platform });

      return NextResponse.json(
        { error: 'Invalid request data', details: validation.errors },
        { status: 400 }
      );
    }

    // Platform-specific verification
    if (platform === 'farcaster' && token) {
      const isValid = await verifyFarcasterToken(token);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid Farcaster authentication token' },
          { status: 401 }
        );
      }
    }

    // Step 1: Ensure user row exists and update metadata (without touching wallet fields)
    const { error: upsertError } = await supabase
      .from('minisend_users')
      .upsert({
        user_id: userId,
        platform,
        connected_wallet: walletAddress,
        email,
        last_login_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,platform',
      });

    if (upsertError) {
      console.error('Database error on user upsert:', upsertError);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    // Step 2: Read current user state
    const { data: currentUser, error: readError } = await supabase
      .from('minisend_users')
      .select('minisend_wallet, blockradar_address_id, display_name, avatar_url')
      .eq('user_id', userId)
      .eq('platform', platform)
      .single();

    if (readError || !currentUser) {
      console.error('Failed to read user after upsert:', readError);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    // Step 3: If wallet already assigned, return it immediately
    if (currentUser.minisend_wallet) {
      return NextResponse.json({
        minisendWallet: currentUser.minisend_wallet,
        blockradarAddressId: currentUser.blockradar_address_id,
        displayName: currentUser.display_name,
        avatarUrl: currentUser.avatar_url,
        existing: true,
      });
    }

    // Step 4: Create new BlockRadar wallet
    const { address: minisendWallet, addressId } = await createBlockRadarWallet({
      user_id: userId,
      platform,
      connected_wallet: walletAddress,
      created_at: Date.now(),
    });

    console.log('✅ BlockRadar wallet created:', {
      userId,
      addressId,
      minisendWallet,
    });

    // Step 5: Atomically assign wallet ONLY if still unassigned.
    // The IS NULL condition ensures exactly one concurrent request wins.
    const { data: updatedUser, error: updateError } = await supabase
      .from('minisend_users')
      .update({
        minisend_wallet: minisendWallet.toLowerCase(),
        blockradar_address_id: addressId,
      })
      .eq('user_id', userId)
      .eq('platform', platform)
      .is('minisend_wallet', null)
      .select('minisend_wallet, blockradar_address_id, display_name, avatar_url')
      .single();

    // Step 6: If update matched no rows, another request already won the race
    if (updateError || !updatedUser) {
      const { data: winnerUser } = await supabase
        .from('minisend_users')
        .select('minisend_wallet, blockradar_address_id, display_name, avatar_url')
        .eq('user_id', userId)
        .eq('platform', platform)
        .single();

      console.log('⚠️ Wallet already assigned by concurrent request:', {
        userId,
        existingWallet: winnerUser?.minisend_wallet,
        discardedWallet: minisendWallet,
      });

      return NextResponse.json({
        minisendWallet: winnerUser?.minisend_wallet,
        blockradarAddressId: winnerUser?.blockradar_address_id,
        displayName: winnerUser?.display_name,
        avatarUrl: winnerUser?.avatar_url,
        existing: true,
      });
    }

    return NextResponse.json({
      minisendWallet: updatedUser.minisend_wallet,
      blockradarAddressId: updatedUser.blockradar_address_id,
      displayName: updatedUser.display_name,
      avatarUrl: updatedUser.avatar_url,
      existing: false,
    });

  } catch (error) {
    console.error('Wallet assignment error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
