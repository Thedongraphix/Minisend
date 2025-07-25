import { NextResponse } from 'next/server';
import { getPaycrestService } from '@/lib/paycrest/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const paycrestService = await getPaycrestService();
    const nodeInfo = await paycrestService.getProviderNodeInfo();

    return NextResponse.json({
      success: true,
      data: nodeInfo
    });

  } catch (error) {
    console.error('PayCrest provider node-info error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get provider node info' },
      { status: 500 }
    );
  }
}