import { NextRequest, NextResponse } from 'next/server';

const PAYCREST_API_URL = process.env.PAYCREST_BASE_URL || 'https://api.paycrest.io/v1';
const PAYCREST_API_KEY = process.env.PAYCREST_API_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!PAYCREST_API_KEY) {
      return NextResponse.json(
        { error: 'PayCrest API key not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    console.log('🔍 Account verification request:', body);
    
    const { accountNumber, bankCode } = body;

    if (!accountNumber || !bankCode) {
      return NextResponse.json(
        { error: 'Missing required fields: accountNumber, bankCode' },
        { status: 400 }
      );
    }

    // Create verify account payload according to PayCrest docs
    const verifyData = {
      institution: bankCode,
      accountIdentifier: accountNumber
    };

    console.log('📦 PayCrest verify account payload:', JSON.stringify(verifyData, null, 2));

    const verifyResponse = await fetch(`${PAYCREST_API_URL}/verify-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-Key': PAYCREST_API_KEY!,
      },
      body: JSON.stringify(verifyData),
    });

    console.log('📡 PayCrest verify response status:', verifyResponse.status);
    
    if (!verifyResponse.ok) {
      let errorData;
      try {
        errorData = await verifyResponse.json();
        console.error('PayCrest verify error (JSON):', JSON.stringify(errorData, null, 2));
      } catch {
        const errorText = await verifyResponse.text();
        console.error('PayCrest verify error (text):', errorText);
        throw new Error(`PayCrest API error ${verifyResponse.status}: ${errorText}`);
      }
      
      return NextResponse.json(
        { error: errorData.message || 'Account verification failed' },
        { status: verifyResponse.status }
      );
    }

    const result = await verifyResponse.json();
    console.log('✅ Account verification result:', result);

    return NextResponse.json({
      success: true,
      accountName: result.data, // According to docs, data field contains the account name
      isValid: result.status === 'success'
    });

  } catch (error) {
    console.error('Account verification error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to verify account' },
      { status: 500 }
    );
  }
}