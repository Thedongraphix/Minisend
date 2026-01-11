/**
 * API Route: Verify Base Account Signature
 * Verifies SIWE signatures from Base Account authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({
  chain: base,
  transport: http(),
});

// In-memory nonce store (use Redis in production)
const usedNonces = new Set<string>();

interface VerifyBaseRequest {
  address: string;
  message: string;
  signature: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyBaseRequest = await request.json();
    const { address, message, signature } = body;

    if (!address || !message || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Extract nonce from message
    const nonceMatch = message.match(/Nonce: (\w+)/);
    if (!nonceMatch) {
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400 }
      );
    }

    const nonce = nonceMatch[1];

    // Check if nonce has been used
    if (usedNonces.has(nonce)) {
      return NextResponse.json(
        { error: 'Nonce already used' },
        { status: 400 }
      );
    }

    // Verify the signature using viem
    // This automatically handles ERC-6492 for undeployed smart wallets
    const isValid = await client.verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Mark nonce as used
    usedNonces.add(nonce);

    // Clean up old nonces after 5 minutes (prevents memory leak)
    setTimeout(() => {
      usedNonces.delete(nonce);
    }, 5 * 60 * 1000);

    // At this point, the user is authenticated
    // You can create a session, JWT, etc.

    return NextResponse.json({
      success: true,
      address,
      authenticated: true,
    });

  } catch (error) {
    console.error('Base signature verification error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Verification failed'
      },
      { status: 500 }
    );
  }
}
