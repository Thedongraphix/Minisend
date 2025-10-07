import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, Order } from '@/lib/supabase/config';
import { fixPaycrestOrdersAccountNames } from '@/lib/utils/accountNameExtractor';

const PAYCREST_API_URL = process.env.PAYCREST_BASE_URL || 'https://api.paycrest.io/v1';
const PAYCREST_API_KEY = process.env.PAYCREST_API_KEY;


// Securely fetch user's orders from PayCrest with pagination and filter by wallet address
async function fetchUserOrdersFromPayCrest(walletAddress: string, requestedLimit: number): Promise<Order[]> {
  if (!PAYCREST_API_KEY) {
    throw new Error('PayCrest API key not configured');
  }

  const userOrders: Order[] = [];
  const pageSize = 100; // Max page size per API call
  let currentPage = 1;
  let hasMorePages = true;

  // Fetch pages until we have enough user orders or no more pages
  while (hasMorePages && userOrders.length < requestedLimit) {
    const response = await fetch(`${PAYCREST_API_URL}/sender/orders?page=${currentPage}&pageSize=${pageSize}&ordering=-createdAt`, {
      headers: {
        'API-Key': PAYCREST_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`PayCrest API error: ${response.status}`);
    }

    const data = await response.json();
    const orders = data.data?.orders || [];
    const totalRecords = data.data?.totalRecords || 0;

    // Fix account names
    const fixedOrders = fixPaycrestOrdersAccountNames(orders);

    // Filter by user's wallet address
    const pageUserOrders = fixedOrders.filter((order: Record<string, unknown>) =>
      (order.returnAddress as string)?.toLowerCase() === walletAddress.toLowerCase() ||
      (order.fromAddress as string)?.toLowerCase() === walletAddress.toLowerCase()
    );

    // Convert to our Order format and add to results
    const convertedOrders = pageUserOrders.map((order: Record<string, unknown>) => {
      const recipient = order.recipient as Record<string, unknown> || {};
      const transactionLogs = (order.transactionLogs as Array<Record<string, unknown>>) || [];
      const latestLog = transactionLogs.length > 0 ? transactionLogs[transactionLogs.length - 1] : null;

      return {
        id: order.id as string,
        paycrest_order_id: order.id as string,
        wallet_address: (order.fromAddress || order.returnAddress) as string,
        amount_in_usdc: parseFloat(String(order.amount || 0)),
        amount_in_local: parseFloat(String(order.amount || 0)) * parseFloat(String(order.rate || 0)),
        local_currency: (recipient.currency as 'KES' | 'NGN') || 'KES',
        phone_number: recipient.currency === 'KES' ? (recipient.accountIdentifier as string) : '',
        account_number: recipient.currency === 'NGN' ? (recipient.accountIdentifier as string) : '',
        account_name: recipient.accountName as string,
        carrier: recipient.currency === 'KES' ? 'MPESA' : 'BANK_TRANSFER',
        status: (order.status as Order['status']) || 'pending',
        paycrest_status: order.status as string,
        transaction_hash: (latestLog?.tx_hash || order.txHash) as string,
        reference_id: order.id as string,
        rate: parseFloat(String(order.rate || 0)),
        network: 'base',
        token: 'USDC',
        receive_address: order.receiveAddress as string,
        institution_code: recipient.institution as string,
        recipient_data: recipient,
        memo: recipient.memo as string,
        created_at: order.createdAt as string,
        updated_at: order.updatedAt as string,
      } as Order;
    });

    userOrders.push(...convertedOrders);

    // Check if there are more pages
    const totalPages = Math.ceil(totalRecords / pageSize);
    hasMorePages = currentPage < totalPages;
    currentPage++;

    // Stop if we've fetched enough for the user
    if (userOrders.length >= requestedLimit) {
      break;
    }
  }

  return userOrders.slice(0, requestedLimit);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const walletAddress = searchParams.get('wallet');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    let orders: Order[] = [];
    let source: 'paycrest' | 'database' = 'paycrest';

    // Try to fetch from PayCrest first for real-time status updates
    try {
      orders = await fetchUserOrdersFromPayCrest(walletAddress, limit);
      source = 'paycrest';
    } catch (paycrestError) {
      // Fallback to database if PayCrest fails
      try {
        const { data, error } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('wallet_address', walletAddress)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        orders = data || [];
        source = 'database';
      } catch (dbError) {
        console.error('Both PayCrest and database fetch failed:', {
          paycrestError: paycrestError instanceof Error ? paycrestError.message : paycrestError,
          dbError: dbError instanceof Error ? dbError.message : dbError
        });
        // Return empty array instead of error
        orders = [];
      }
    }

    return NextResponse.json({
      orders,
      source,
      count: orders.length
    });
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