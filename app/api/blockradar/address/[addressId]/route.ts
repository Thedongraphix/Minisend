/**
 * API Route: Get Blockradar Address Information
 * Retrieves detailed information about a specific Blockradar address
 */

import { NextRequest, NextResponse } from 'next/server';
import { blockradarClient } from '@/lib/blockradar/client';
import { BLOCKRADAR_CONFIG } from '@/lib/blockradar/config';
import type { BlockradarApiError } from '@/lib/blockradar/types';

/**
 * GET /api/blockradar/address/[addressId]
 * Retrieves address information from Blockradar
 * 
 * Query Parameters:
 * - showPrivateKey: boolean (optional) - If true, includes the private key in the response
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const showPrivateKey = searchParams.get('showPrivateKey') === 'true';

    console.log('[Blockradar Address API] Fetching address:', {
      addressId,
      showPrivateKey,
      timestamp: new Date().toISOString(),
    });

    // Fetch address information from Blockradar
    const addressData = await blockradarClient.getAddress(
      BLOCKRADAR_CONFIG.WALLET_ID!,
      addressId,
      showPrivateKey
    );

    console.log('[Blockradar Address API] Successfully retrieved address');

    return NextResponse.json({
      success: true,
      data: addressData.data,
      message: addressData.message,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Blockradar Address API] Error:', error);

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
        error: error instanceof Error ? error.message : 'Failed to fetch address information',
      },
      { status: 500 }
    );
  }
}

