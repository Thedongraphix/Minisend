import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/lib/supabase/orders';
import { UserService } from '@/lib/supabase/users';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Get user transactions
    const transactions = await OrderService.getOrdersByWallet(
      walletAddress,
      Math.min(limit, 50), // Cap at 50 transactions per request
      offset
    );

    // Get user summary statistics
    const userStats = await OrderService.getWalletStats(walletAddress);

    // Get user profile if exists
    let userProfile = null;
    try {
      userProfile = await UserService.getUserByWallet(walletAddress);
    } catch (error) {
      // User might not exist yet, that's okay
      console.log('User profile not found, continuing without it');
    }

    return NextResponse.json({
      success: true,
      wallet_address: walletAddress,
      transactions,
      stats: userStats,
      user_profile: userProfile,
      pagination: {
        limit,
        offset,
        has_more: transactions.length === limit // Simple check, could be more sophisticated
      }
    });

  } catch (error) {
    console.error('Transaction history fetch error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: error.message,
          success: false 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch transaction history',
        success: false 
      },
      { status: 500 }
    );
  }
}