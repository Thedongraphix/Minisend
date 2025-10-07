import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

interface UserStats {
  wallet_address: string;
  fid?: number;
  username?: string;
  display_name?: string;
  pfp_url?: string;
  daily_transactions: number;
  total_usdc: number;
  total_local: number;
  local_currency: string;
  last_transaction: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'today';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    let startDate: Date;
    const now = new Date();

    switch (period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'all':
      default:
        startDate = new Date(0);
        break;
    }

    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('wallet_address, amount_in_usdc, amount_in_local, local_currency, created_at, status')
      .gte('created_at', startDate.toISOString())
      .in('status', ['completed', 'fulfilled', 'settled']);

    if (ordersError) {
      return NextResponse.json(
        { error: 'Failed to fetch orders', details: ordersError.message },
        { status: 500 }
      );
    }

    const walletStats = new Map<string, UserStats>();

    orders?.forEach((order) => {
      const wallet = order.wallet_address.toLowerCase();

      if (!walletStats.has(wallet)) {
        walletStats.set(wallet, {
          wallet_address: order.wallet_address,
          daily_transactions: 0,
          total_usdc: 0,
          total_local: 0,
          local_currency: order.local_currency,
          last_transaction: order.created_at,
        });
      }

      const stats = walletStats.get(wallet)!;
      stats.daily_transactions += 1;
      stats.total_usdc += order.amount_in_usdc || 0;
      stats.total_local += order.amount_in_local || 0;

      if (new Date(order.created_at) > new Date(stats.last_transaction)) {
        stats.last_transaction = order.created_at;
      }
    });

    const { data: farcasterUsers, error: farcasterError } = await supabaseAdmin
      .from('farcaster_users')
      .select('wallet_address, fid, username, display_name, pfp_url');

    if (!farcasterError && farcasterUsers) {
      farcasterUsers.forEach((user) => {
        const wallet = user.wallet_address.toLowerCase();
        const stats = walletStats.get(wallet);
        if (stats) {
          stats.fid = user.fid;
          stats.username = user.username;
          stats.display_name = user.display_name;
          stats.pfp_url = user.pfp_url;
        }
      });
    }

    const leaderboard = Array.from(walletStats.values())
      .sort((a, b) => {
        if (b.daily_transactions !== a.daily_transactions) {
          return b.daily_transactions - a.daily_transactions;
        }
        return b.total_usdc - a.total_usdc;
      })
      .slice(0, limit)
      .map((stats, index) => ({
        rank: index + 1,
        ...stats,
        points: stats.daily_transactions,
      }));

    return NextResponse.json({
      success: true,
      period,
      leaderboard,
      total_users: walletStats.size,
      updated_at: new Date().toISOString(),
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
