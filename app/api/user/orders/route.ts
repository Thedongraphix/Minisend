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

    let paycrestOrders: Order[] = [];
    let pretiumOrders: Order[] = [];
    let source: 'paycrest' | 'database' | 'both' = 'paycrest';

    // Try to fetch PayCrest orders first for real-time status updates
    try {
      paycrestOrders = await fetchUserOrdersFromPayCrest(walletAddress, limit);
      source = 'paycrest';
    } catch (paycrestError) {
      // Fallback to database for PayCrest orders if API fails
      try {
        const { data, error } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('wallet_address', walletAddress)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        paycrestOrders = data || [];
        source = 'database';
      } catch (dbError) {
        console.error('Both PayCrest and database fetch failed:', {
          paycrestError: paycrestError instanceof Error ? paycrestError.message : paycrestError,
          dbError: dbError instanceof Error ? dbError.message : dbError
        });
        paycrestOrders = [];
      }
    }

    // Always fetch Pretium orders from database
    try {
      const { data, error } = await supabaseAdmin
        .from('pretium_orders')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data) {
        pretiumOrders = data.map(order => ({
          id: order.id,
          wallet_address: order.wallet_address,
          amount_in_usdc: order.amount_in_usdc,
          amount_in_local: order.amount_in_local,
          local_currency: order.local_currency,
          phone_number: order.phone_number || undefined,
          till_number: order.till_number || undefined,
          paybill_number: order.paybill_number || undefined,
          paybill_account: order.paybill_account || undefined,
          account_name: order.account_name || undefined,
          status: order.status,
          transaction_hash: order.transaction_hash || undefined,
          created_at: order.created_at,
          updated_at: order.updated_at,
          pretium_transaction_code: order.transaction_code,
          pretium_receipt_number: order.receipt_number || undefined,
          exchange_rate: order.exchange_rate || 0,
          sender_fee: order.sender_fee || 0,
        })) as Order[];
        source = source === 'paycrest' ? 'both' : 'database';
      }
    } catch (pretiumError) {
      console.error('Failed to fetch Pretium orders:', pretiumError);
      // Continue even if Pretium fetch fails
    }

    // Combine and sort all orders by created_at
    const allOrders = [...paycrestOrders, ...pretiumOrders].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({
      orders: allOrders.slice(0, limit),
      source,
      count: allOrders.length,
      paycrestCount: paycrestOrders.length,
      pretiumCount: pretiumOrders.length,
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