/**
 * Blockradar Payment Links API
 * Full-featured payment links for stablecoin payments
 */

import { NextRequest, NextResponse } from 'next/server';

const BLOCKRADAR_API_KEY = process.env.BLOCKRADAR_API_KEY;
const BLOCKRADAR_API_URL = 'https://api.blockradar.co/v1/payment_links';

interface CreatePaymentLinkRequest {
  name: string;
  description?: string;
  slug?: string;
  amount?: string;
  redirectUrl?: string;
  successMessage?: string;
  inactiveMessage?: string;
  metadata?: Record<string, string | number>;
  paymentLimit?: number;
}

interface BlockradarPaymentLink {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  amount: string | null;
  currency: string;
  imageUrl: string | null;
  redirectUrl: string | null;
  successMessage: string | null;
  inactiveMessage: string | null;
  active: boolean;
  network: string;
  type: string;
  metadata: Record<string, unknown> | null;
  configurations: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  url?: string;
}

interface BlockradarResponse {
  status?: boolean;
  statusCode: number;
  message: string;
  data: BlockradarPaymentLink | BlockradarPaymentLink[];
}

/**
 * Transform Blockradar link to our format
 */
function transformLink(link: BlockradarPaymentLink) {
  return {
    id: link.id,
    name: link.name,
    description: link.description,
    slug: link.slug,
    url: link.url || `https://pay.blockradar.co/${link.slug}`,
    amount: link.amount,
    currency: link.currency || 'USD',
    active: link.active,
    redirectUrl: link.redirectUrl,
    successMessage: link.successMessage,
    imageUrl: link.imageUrl,
    network: link.network,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
  };
}

/**
 * POST /api/blockradar/payment-links
 * Create a new payment link
 */
export async function POST(request: NextRequest) {
  try {
    if (!BLOCKRADAR_API_KEY) {
      return NextResponse.json(
        { error: 'Blockradar API key not configured' },
        { status: 500 }
      );
    }

    const body: CreatePaymentLinkRequest = await request.json();

    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Build form data for Blockradar API (as per docs)
    const formData = new FormData();
    formData.append('name', body.name.trim());

    if (body.description?.trim()) {
      formData.append('description', body.description.trim());
    }

    if (body.slug?.trim()) {
      // Validate slug format
      const slugRegex = /^[a-zA-Z0-9-]+$/;
      if (!slugRegex.test(body.slug.trim())) {
        return NextResponse.json(
          { error: 'Slug must only contain letters, numbers, and hyphens' },
          { status: 400 }
        );
      }
      formData.append('slug', body.slug.trim());
    }

    if (body.amount?.trim()) {
      const amount = parseFloat(body.amount);
      if (isNaN(amount) || amount <= 0) {
        return NextResponse.json(
          { error: 'Amount must be a valid number greater than 0' },
          { status: 400 }
        );
      }
      formData.append('amount', body.amount.trim());
    }

    if (body.redirectUrl?.trim()) {
      if (!body.redirectUrl.startsWith('http://') && !body.redirectUrl.startsWith('https://')) {
        return NextResponse.json(
          { error: 'Redirect URL must start with http:// or https://' },
          { status: 400 }
        );
      }
      formData.append('redirectUrl', body.redirectUrl.trim());
    }

    if (body.successMessage?.trim()) {
      formData.append('successMessage', body.successMessage.trim());
    }

    if (body.inactiveMessage?.trim()) {
      formData.append('inactiveMessage', body.inactiveMessage.trim());
    }

    if (body.metadata && Object.keys(body.metadata).length > 0) {
      formData.append('metadata', JSON.stringify(body.metadata));
    }

    if (body.paymentLimit && body.paymentLimit >= 1) {
      formData.append('paymentLimit', body.paymentLimit.toString());
    }

    const response = await fetch(BLOCKRADAR_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': BLOCKRADAR_API_KEY,
      },
      body: formData,
    });

    const data: BlockradarResponse = await response.json();

    if (!response.ok) {
      console.error('Blockradar API error:', data);
      return NextResponse.json(
        { error: data.message || 'Failed to create payment link' },
        { status: response.status }
      );
    }

    const link = data.data as BlockradarPaymentLink;
    return NextResponse.json(transformLink(link));

  } catch (error) {
    console.error('Payment link creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/blockradar/payment-links
 * List all payment links
 */
export async function GET(request: NextRequest) {
  try {
    if (!BLOCKRADAR_API_KEY) {
      return NextResponse.json(
        { error: 'Blockradar API key not configured' },
        { status: 500 }
      );
    }

    // Support pagination
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';

    const response = await fetch(
      `${BLOCKRADAR_API_URL}?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': BLOCKRADAR_API_KEY,
        },
      }
    );

    const data: BlockradarResponse = await response.json();

    if (!response.ok) {
      console.error('Blockradar API error:', data);
      return NextResponse.json(
        { error: data.message || 'Failed to fetch payment links' },
        { status: response.status }
      );
    }

    const links = Array.isArray(data.data)
      ? data.data.map(transformLink)
      : [];

    return NextResponse.json({
      links,
      total: links.length,
    });

  } catch (error) {
    console.error('Payment links fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
