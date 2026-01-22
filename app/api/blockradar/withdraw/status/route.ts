/**
 * API Route: Blockradar Withdraw Status
 * Checks the status of a withdrawal transaction
 */

import { NextRequest, NextResponse } from 'next/server';
import { BLOCKRADAR_CONFIG, getBlockradarHeaders } from '@/lib/blockradar';

interface WithdrawStatusRequestBody {
  withdrawalId: string;
}

/**
 * POST /api/blockradar/withdraw/status
 * Checks the status of a withdrawal transaction
 */
export async function POST(request: NextRequest) {
  try {
    const body: WithdrawStatusRequestBody = await request.json();
    const { withdrawalId } = body;

    if (!withdrawalId) {
      return NextResponse.json(
        { success: false, error: 'Withdrawal ID is required' },
        { status: 400 }
      );
    }

    console.log('[Blockradar Withdraw Status] Checking status for:', withdrawalId);

    // Fetch withdrawal status from Blockradar
    const response = await fetch(
      `https://api.blockradar.co/v1/wallets/${BLOCKRADAR_CONFIG.WALLET_ID}/transactions/${withdrawalId}`,
      {
        method: 'GET',
        headers: getBlockradarHeaders(),
      }
    );

    const data = await response.json();

    console.log('[Blockradar Withdraw Status] Response:', {
      status: data.data?.status,
      hash: data.data?.hash,
      confirmed: data.data?.confirmed,
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.message || 'Failed to get withdrawal status' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.data?.id,
        status: data.data?.status,
        hash: data.data?.hash,
        confirmed: data.data?.confirmed,
        amount: data.data?.amount,
        recipientAddress: data.data?.recipientAddress,
      },
    });

  } catch (error) {
    console.error('[Blockradar Withdraw Status] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check withdrawal status',
      },
      { status: 500 }
    );
  }
}
