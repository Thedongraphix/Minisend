import { NextRequest, NextResponse } from 'next/server';

const PAYCREST_API_URL = process.env.PAYCREST_BASE_URL || 'https://api.paycrest.io/v1';
const PAYCREST_API_KEY = process.env.PAYCREST_API_KEY;

export async function GET(request: NextRequest) {
  try {
    if (!PAYCREST_API_KEY) {
      return NextResponse.json(
        { error: 'PayCrest API key not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const network = searchParams.get('network');
    const token = searchParams.get('token'); 
    const status = searchParams.get('status');
    const page = searchParams.get('page');
    const pageSize = searchParams.get('pageSize');
    
    // Build query params
    const params = new URLSearchParams();
    if (network) params.append('network', network);
    if (token) params.append('token', token);
    if (status) params.append('status', status);
    if (page) params.append('page', page);
    if (pageSize) params.append('pageSize', pageSize);
    
    const queryString = params.toString();
    const url = `${PAYCREST_API_URL}/sender/orders${queryString ? `?${queryString}` : ''}`;
    
    console.log('🔍 Fetching orders from:', url);
    
    const response = await fetch(url, {
      headers: {
        'API-Key': PAYCREST_API_KEY!,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PayCrest API error:', response.status, errorText);
      return NextResponse.json(
        { error: `PayCrest API error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('📊 Orders response:', data);

    return NextResponse.json({
      success: true,
      ...data
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}