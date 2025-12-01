import { NextRequest, NextResponse } from 'next/server';
import { pretiumClient } from '@/lib/pretium/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionCode: string }> }
) {
  try {
    const { transactionCode } = await params;

    if (!transactionCode) {
      return NextResponse.json(
        { error: 'Transaction code is required' },
        { status: 400 }
      );
    }

    const statusResponse = await pretiumClient.getTransactionStatus(transactionCode);

    if (statusResponse.code !== 200) {
      return NextResponse.json(
        { error: statusResponse.message },
        { status: statusResponse.code }
      );
    }

    return NextResponse.json({
      success: true,
      transaction: statusResponse.data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch transaction status',
      },
      { status: 500 }
    );
  }
}
