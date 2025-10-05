import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, Order } from '@/lib/supabase/config';
import { fixPaycrestOrdersAccountNames } from '@/lib/utils/accountNameExtractor';

const PAYCREST_API_URL = process.env.PAYCREST_BASE_URL || 'https://api.paycrest.io/v1';
const PAYCREST_API_KEY = process.env.PAYCREST_API_KEY;


// Securely fetch user's orders from PayCrest and filter by wallet address
async function fetchUserOrdersFromPayCrest(walletAddress: string, limit: number): Promise<Order[]> {
  if (!PAYCREST_API_KEY) {
    throw new Error('PayCrest API key not configured');
  }

  const response = await fetch(`${PAYCREST_API_URL}/sender/orders?pageSize=${Math.min(limit, 100)}`, {
    headers: {
      'API-Key': PAYCREST_API_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`PayCrest API error: ${response.status}`);
  }

  const data = await response.json();
  const allOrders = data.data?.orders || [];
  
  // Fix account names and filter by user's wallet address
  const fixedOrders = fixPaycrestOrdersAccountNames(allOrders);
  const userOrders = fixedOrders.filter((order: Record<string, unknown>) => 
    (order.returnAddress as string)?.toLowerCase() === walletAddress.toLowerCase() ||
    (order.fromAddress as string)?.toLowerCase() === walletAddress.toLowerCase()
  );

  // Convert to our Order format
  return userOrders.map((order: Record<string, unknown>) => {
    const recipient = order.recipient as Record<string, unknown> || {};
    return {
      id: order.id as string,
      paycrest_order_id: order.id as string,
      wallet_address: (order.fromAddress || order.returnAddress) as string,
      amount_in_usdc: parseFloat((order.amount as string) || '0') || 0,
      amount_in_local: (parseFloat((order.amount as string) || '0') || 0) * (parseFloat((order.rate as string) || '0') || 0),
      local_currency: (recipient.currency as 'KES' | 'NGN') || 'KES',
      phone_number: recipient.currency === 'KES' ? (recipient.accountIdentifier as string) : '',
      account_number: recipient.currency === 'NGN' ? (recipient.accountIdentifier as string) : '',
      account_name: recipient.accountName as string,
      carrier: recipient.currency === 'KES' ? 'MPESA' : 'BANK_TRANSFER',
      status: (order.status as Order['status']) || 'pending',
      paycrest_status: order.status as string,
      transaction_hash: order.txHash as string,
      reference_id: order.id as string,
      rate: parseFloat((order.rate as string) || '0') || 0,
      network: 'base',
      token: 'USDC',
      receive_address: order.receiveAddress as string,
      institution_code: recipient.institution as string,
      recipient_data: recipient,
      memo: recipient.memo as string,
      created_at: order.createdAt as string,
      updated_at: order.createdAt as string,
    } as Order;
  });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const walletAddress = searchParams.get('wallet');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }
    
    // Try to fetch orders from database first
    let orders: Order[] = [];
    try {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      orders = data || [];
    } catch {
      orders = [];
    }

    // If no orders in database, try to fetch from PayCrest for this specific wallet
    if (orders.length === 0) {
      try {
        const paycrestOrders = await fetchUserOrdersFromPayCrest(walletAddress, limit);
        orders = paycrestOrders;
      } catch (paycrestError) {
        console.warn('PayCrest fallback failed:', paycrestError);
        // Still return empty array rather than error
      }
    }

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Detailed error fetching user orders:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      walletAddress: request.nextUrl.searchParams.get('wallet')
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch user orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}