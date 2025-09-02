import { NextRequest, NextResponse } from 'next/server';
import { formatTillNumber, formatPhoneNumber } from '@/lib/utils/tillValidator';

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
    console.log('🔍 Account verification request received');
    
    const { 
      accountNumber, 
      bankCode, 
      phoneNumber, 
      tillNumber, 
      paybillNumber,
      currency 
    } = body;

    // Validate required fields based on payment type
    let institution: string;
    let accountIdentifier: string;

    if (currency === 'KES') {
      // For Kenya, accept phone number, till number, or paybill number
      if (phoneNumber) {
        institution = 'SAFAKEPC';
        accountIdentifier = formatPhoneNumber(phoneNumber);
      } else if (tillNumber) {
        institution = 'SAFAKEPC';
        accountIdentifier = formatTillNumber(tillNumber);
      } else if (paybillNumber) {
        institution = 'SAFAKEPC';
        accountIdentifier = formatTillNumber(paybillNumber);
      } else {
        return NextResponse.json(
          { error: 'Missing required field: phoneNumber, tillNumber, or paybillNumber for KES' },
          { status: 400 }
        );
      }
    } else {
      // For other currencies, require account number and bank code
      if (!accountNumber || !bankCode) {
        return NextResponse.json(
          { error: 'Missing required fields: accountNumber, bankCode' },
          { status: 400 }
        );
      }
      institution = bankCode;
      accountIdentifier = accountNumber;
    }

    // Create verify account payload according to PayCrest docs
    const verifyData = {
      institution,
      accountIdentifier
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