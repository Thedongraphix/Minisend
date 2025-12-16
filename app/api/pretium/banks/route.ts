import { NextResponse } from 'next/server';
import { PRETIUM_CONFIG, getPretiumHeaders } from '@/lib/pretium/config';

export async function GET() {
  try {
    const response = await fetch(
      `${PRETIUM_CONFIG.BASE_URL}/v1/banks`,
      {
        method: 'POST',
        headers: getPretiumHeaders(),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch banks from Pretium' },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.code !== 200) {
      return NextResponse.json(
        { error: data.message || 'Failed to fetch banks' },
        { status: data.code }
      );
    }

    // Transform Pretium bank format to match our expected format
    const banks = data.data.map((bank: { Code: string; Name: string }) => ({
      code: bank.Code,
      name: bank.Name,
      type: 'BANK',
    }));

    return NextResponse.json({
      success: true,
      institutions: banks,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch banks',
      },
      { status: 500 }
    );
  }
}
