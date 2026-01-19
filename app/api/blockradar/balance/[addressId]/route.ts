/**
 * API Route: Get Blockradar Address Balances
 * Retrieves the balances for a specific address in a wallet
 */

import { NextRequest, NextResponse } from 'next/server';
import { blockradarClient } from '@/lib/blockradar/client';
import type { BlockradarApiError, BlockradarBalanceItem } from '@/lib/blockradar/types';

/**
 * GET /api/blockradar/balance/[addressId]
 * Retrieves balance information from Blockradar
 *
 * Query params:
 * - asset: Optional asset symbol to filter (e.g., 'USDC', 'ETH')
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ addressId: string }> }
) {
  try {
    const params = await context.params;
    const { addressId } = params;
    const { searchParams } = new URL(request.url);
    const assetFilter = searchParams.get('asset')?.toUpperCase();

    if (!addressId) {
      return NextResponse.json(
        { error: 'Address ID is required' },
        { status: 400 }
      );
    }

    console.log('[Blockradar Balance API] Fetching balances for address:', {
      addressId,
      assetFilter,
      timestamp: new Date().toISOString(),
    });

    // Fetch balances from Blockradar
    const balancesResponse = await blockradarClient.getAddressBalances(addressId);

    console.log('[Blockradar Balance API] Successfully retrieved balances:', {
      totalAssets: balancesResponse.data.length,
      assets: balancesResponse.data.map((item: BlockradarBalanceItem) => ({
        symbol: item.asset.asset.symbol,
        balance: item.balance,
      })),
    });

    // If asset filter specified, return specific asset balance
    if (assetFilter) {
      const filteredBalance = balancesResponse.data.find(
        (item: BlockradarBalanceItem) => item.asset.asset.symbol.toUpperCase() === assetFilter
      );

      if (!filteredBalance) {
        return NextResponse.json(
          {
            success: false,
            error: `Asset ${assetFilter} not found in balances`,
          },
          { status: 404 }
        );
      }

      // Return in a format compatible with the existing hook
      return NextResponse.json({
        success: true,
        data: {
          asset: {
            symbol: filteredBalance.asset.asset.symbol,
            name: filteredBalance.asset.asset.name,
            decimals: filteredBalance.asset.asset.decimals,
            logoUrl: filteredBalance.asset.asset.logoUrl,
            network: filteredBalance.asset.asset.network,
            address: filteredBalance.asset.asset.address,
            blockchain: filteredBalance.asset.asset.blockchain,
          },
          balance: filteredBalance.balance,
          convertedBalance: filteredBalance.convertedBalance,
        },
        message: balancesResponse.message,
        timestamp: new Date().toISOString(),
      });
    }

    // Return all balances
    return NextResponse.json({
      success: true,
      data: balancesResponse.data,
      message: balancesResponse.message,
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

