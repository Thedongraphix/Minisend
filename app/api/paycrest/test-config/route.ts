import { NextResponse } from 'next/server';

// Force dynamic rendering and Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Test PayCrest configuration without importing the full service
    const apiKey = process.env.PAYCREST_API_KEY;
    const clientSecret = process.env.PAYCREST_CLIENT_SECRET;
    const baseUrl = process.env.PAYCREST_BASE_URL;
    
    return NextResponse.json({
      success: true,
      config: {
        hasApiKey: !!apiKey,
        hasClientSecret: !!clientSecret,
        baseUrl: baseUrl || 'not set',
        apiKeyPrefix: apiKey ? apiKey.substring(0, 8) + '...' : 'not set'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}