import { NextRequest, NextResponse } from 'next/server';

// 🚨 SECURITY: This endpoint has been DISABLED due to critical data exposure vulnerability
// Reported by cybersecurity audit - CVSS 9.1 Critical
// 
// Issue: Public endpoint was exposing:
// - Customer phone numbers
// - Recipient names  
// - Wallet addresses
// - Transaction hashes
// - PII in memo fields
//
// Resolution: Endpoint completely disabled to prevent data harvesting
// Users should use /api/user/orders for authenticated access to their own data

export async function GET(request: NextRequest) {
  const securityHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache', 
    'Expires': '0',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer'
  };

  // Log the attempt for security monitoring
  console.warn(`🔒 SECURITY: Blocked access to disabled endpoint /api/paycrest/orders from IP: ${request.ip || request.headers.get('x-forwarded-for') || 'unknown'}`);

  return NextResponse.json(
    { 
      error: 'This endpoint has been disabled for security reasons',
      message: 'This endpoint was exposing sensitive customer data and has been permanently disabled.',
      alternatives: [
        {
          endpoint: '/api/user/orders',
          description: 'Get orders for a specific wallet address',
          usage: '/api/user/orders?wallet=0x...'
        }
      ],
      securityNotice: 'If you need access to this data, please contact support with a valid business case.',
      timestamp: new Date().toISOString()
    },
    { 
      status: 410, // 410 Gone - endpoint permanently removed
      headers: securityHeaders 
    }
  );
}