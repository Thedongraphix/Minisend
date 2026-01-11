/**
 * API Route: Get Blockradar Gateway Balance
 * Retrieves the gateway balance for a specific Blockradar address
 */

import { NextRequest, NextResponse } from 'next/server';
import { blockradarClient } from '@/lib/blockradar/client';
import type { BlockradarApiError } from '@/lib/blockradar/types';

/**
 * GET /api/blockradar/balance/[addressId]
 * Retrieves gateway balance information from Blockradar
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ addressId: string }> }
) {
  try {
    const params = await context.params;
    const { addressId } = params;

    if (!addressId) {
      return NextResponse.json(
        { error: 'Address ID is required' },
        { status: 400 }
      );
    }

    console.log('[Blockradar Balance API] Fetching balance for address:', {
      addressId,
      timestamp: new Date().toISOString(),
    });

    // Fetch gateway balance from Blockradar
    const balanceData = await blockradarClient.getGatewayBalance(addressId);

    console.log('[Blockradar Balance API] Successfully retrieved balance:', {
      balance: balanceData.data.balance,
      asset: balanceData.data.asset.symbol,
    });

    return NextResponse.json({
      success: true,
      data: balanceData.data,
      message: balanceData.message,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Blockradar Balance API] Error:', error);

    // Handle Blockradar API errors
    if ((error as BlockradarApiError).statusCode) {
      const apiError = error as BlockradarApiError;
      return NextResponse.json(
        {
          success: false,
          error: apiError.message,
          details: apiError.data,
        },
        { status: apiError.statusCode }
      );
    }

    // Handle other errors
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch balance information',
      },
      { status: 500 }
    );
  }
}

