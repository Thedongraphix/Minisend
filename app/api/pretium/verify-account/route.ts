import { NextRequest, NextResponse } from 'next/server';
import { PRETIUM_CONFIG, getPretiumHeaders } from '@/lib/pretium/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountNumber, bankCode } = body;

    // Validate required fields
    if (!accountNumber || !bankCode) {
      return NextResponse.json(
        { error: 'Account number and bank code are required' },
        { status: 400 }
      );
    }

    // Validate account number format (10-11 digits for Nigerian banks)
    const cleanAccount = accountNumber.replace(/\D/g, '');
    if (cleanAccount.length < 10 || cleanAccount.length > 11) {
      return NextResponse.json(
        { error: 'Invalid account number format (must be 10-11 digits)' },
        { status: 400 }
      );
    }

    // Call Pretium validation API
    const validationResponse = await fetch(
      `${PRETIUM_CONFIG.BASE_URL}/v1/validation/NGN`,
      {
        method: 'POST',
        headers: getPretiumHeaders(),
        body: JSON.stringify({
          account_number: cleanAccount,
          bank_code: bankCode,
        }),
      }
    );

    if (!validationResponse.ok) {
      // If validation API fails, return error
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to validate account with Pretium',
        },
        { status: validationResponse.status }
      );
    }

    const validationData = await validationResponse.json();

    // Check if validation was successful
    if (validationData.code === 200 && validationData.data) {
      const { account_name, bank_name, status } = validationData.data;

      // Check if account validation was successful
      if (status === 'COMPLETE' && account_name) {
        return NextResponse.json({
          success: true,
          isValid: true,
          accountName: account_name.trim(),
          bankName: bank_name,
          verified: true,
          message: 'Account verified successfully',
        });
      }

      // If status is not COMPLETE, account might not exist
      return NextResponse.json({
        success: false,
        isValid: false,
        error: 'Account validation failed - account may not exist',
        verified: false,
      });
    }

    // If Pretium returns non-200 code
    return NextResponse.json({
      success: false,
      isValid: false,
      error: validationData.message || 'Account validation failed',
      verified: false,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to verify account',
        success: false,
        isValid: false,
        verified: false,
      },
      { status: 500 }
    );
  }
}
