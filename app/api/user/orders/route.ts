import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService, Order } from '@/lib/supabase/config';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const walletAddress = searchParams.get('wallet');
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log('API Request - Wallet:', walletAddress, 'Limit:', limit);

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    console.log('Fetching orders for wallet:', walletAddress);
    
    // Try to fetch orders, but handle gracefully if table doesn't exist or is empty
    let orders: Order[];
    try {
      orders = await DatabaseService.getOrdersByWallet(walletAddress, limit);
      console.log('Orders fetched successfully:', orders.length);
    } catch (dbError) {
      console.warn('Database query failed, returning empty orders:', dbError);
      orders = []; // Return empty array if database query fails
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