import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/config';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ txHash: string }> }
) {
  try {
    const { txHash } = await params;

    if (!txHash) {
      return NextResponse.json(
        { error: 'Transaction hash is required' },
        { status: 400 }
      );
    }

    // Search for order by transaction hash
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('transaction_hash', txHash)
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          error: 'Transaction not found in database',
          txHash,
          hint: 'This transaction may not have been processed yet, or the disbursement failed before recording'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch order',
      },
      { status: 500 }
    );
  }
}
