import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet_address, fid, username, display_name, pfp_url } = body;

    if (!wallet_address || !fid) {
      return NextResponse.json(
        { error: 'Wallet address and FID are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('farcaster_users')
      .upsert(
        {
          wallet_address: wallet_address.toLowerCase(),
          fid,
          username,
          display_name,
          pfp_url,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'wallet_address',
        }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to store Farcaster user data', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: data,
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
