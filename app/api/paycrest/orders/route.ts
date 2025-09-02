import { NextResponse } from 'next/server';

// Endpoint completely removed - return standard 404 to avoid detection
export async function GET() {
  return NextResponse.json(
    { message: 'Not Found' },
    { status: 404 }
  );
}