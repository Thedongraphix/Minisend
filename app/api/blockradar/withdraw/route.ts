/**
 * API Route: Blockradar Withdraw
 * Withdraws USDC from a user's Blockradar address to an external address
 */

import { NextRequest, NextResponse } from 'next/server';
import { blockradarClient, BLOCKRADAR_CONFIG } from '@/lib/blockradar';
import type { BlockradarApiError } from '@/lib/blockradar';

interface WithdrawRequestBody {
  addressId: string;
  recipientAddress: string;
  amount: string;
  reference?: string;
  note?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Gets the USDC asset ID from the address's balances
 * This returns the wallet-specific asset ID that works for withdrawals
 */
async function getUsdcAssetIdFromBalance(addressId: string): Promise<{ assetId: string; balance: string } | null> {
  console.log('[Blockradar Withdraw] Fetching USDC asset ID from address balances...');

  try {
    const balancesResponse = await blockradarClient.getAddressBalances(addressId);

    console.log('[Blockradar Withdraw] Balances response:', JSON.stringify(balancesResponse.data?.map(b => ({
      symbol: b.asset?.asset?.symbol,
      balance: b.balance,
      assetId: b.asset?.id,
      innerAssetId: b.asset?.asset?.id,
      blockchain: b.asset?.asset?.blockchain?.slug,
    })), null, 2));

    // Find the USDC balance entry
    const usdcBalance = balancesResponse.data.find(
      (item) => item.asset?.asset?.symbol === 'USDC'
    );

    if (usdcBalance && usdcBalance.asset) {
      // Try different ID fields - the wallet asset ID might be what we need
      const walletAssetId = usdcBalance.asset.id;
      const innerAssetId = usdcBalance.asset.asset?.id;

      console.log('[Blockradar Withdraw] Found USDC asset IDs:', {
        walletAssetId,
        innerAssetId,
        balance: usdcBalance.balance,
      });

      // Return the wallet asset ID (the one associated with this specific wallet)
      return {
        assetId: walletAssetId,
        balance: usdcBalance.balance,
      };
    }

    return null;
  } catch (error) {
    console.error('[Blockradar Withdraw] Error fetching balances:', error);
    return null;
  }
}

/**
 * POST /api/blockradar/withdraw
 * Initiates a withdrawal from a user's Blockradar address
 */
export async function POST(request: NextRequest) {
  try {
    const body: WithdrawRequestBody = await request.json();
    const { addressId, recipientAddress, amount, reference, note, metadata } = body;

    // Validate required fields
    if (!addressId) {
      return NextResponse.json(
        { success: false, error: 'Address ID is required' },
        { status: 400 }
      );
    }

    if (!recipientAddress) {
      return NextResponse.json(
        { success: false, error: 'Recipient address is required' },
        { status: 400 }
      );
    }

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Get the USDC asset ID from the address's balances (wallet-specific)
    const usdcInfo = await getUsdcAssetIdFromBalance(addressId);

    if (!usdcInfo) {
      return NextResponse.json(
        { success: false, error: 'USDC asset not found in wallet. Please ensure you have USDC deposited.' },
        { status: 400 }
      );
    }

    const { assetId, balance } = usdcInfo;

    // Sanitize amount: USDC has 6 decimals, BlockRadar rejects >8 decimal places
    const sanitizedAmount = parseFloat(amount).toFixed(6).replace(/\.?0+$/, '');

    // Check if user has sufficient balance
    const requestedAmount = parseFloat(sanitizedAmount);
    const availableBalance = parseFloat(balance);

    if (requestedAmount > availableBalance) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient USDC balance',
          balanceInfo: {
            currentBalance: availableBalance,
            requiredAmount: requestedAmount,
            insufficientBy: requestedAmount - availableBalance,
          }
        },
        { status: 400 }
      );
    }

    console.log('[Blockradar Withdraw] Initiating withdrawal:', {
      addressId,
      recipientAddress,
      amount: sanitizedAmount,
      originalAmount: amount,
      assetId,
      availableBalance: balance,
      reference,
      timestamp: new Date().toISOString(),
    });

    // Execute the withdrawal
    const withdrawResponse = await blockradarClient.withdrawFromAddress(
      addressId,
      {
        assetId,
        address: recipientAddress,
        amount: sanitizedAmount,
        reference: reference || `minisend-${Date.now()}`,
        note: note || 'Minisend cashout',
        metadata: {
          ...metadata,
          source: 'minisend',
          platform: 'web',
        },
      },
      BLOCKRADAR_CONFIG.WALLET_ID
    );

    console.log('[Blockradar Withdraw] Withdrawal successful:', {
      transactionId: withdrawResponse.data.id,
      hash: withdrawResponse.data.hash,
      status: withdrawResponse.data.status,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: withdrawResponse.data.id,
        hash: withdrawResponse.data.hash,
        status: withdrawResponse.data.status,
        amount: withdrawResponse.data.amount,
        recipientAddress: withdrawResponse.data.recipientAddress,
      },
      message: withdrawResponse.message,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Blockradar Withdraw] Error:', error);

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
        error: error instanceof Error ? error.message : 'Failed to process withdrawal',
      },
      { status: 500 }
    );
  }
}
