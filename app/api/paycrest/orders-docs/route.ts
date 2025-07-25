import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const documentation = {
    title: "Minisend PayCrest API Documentation",
    version: "1.0.0",
    baseUrl: "https://minisend.xyz/api/paycrest",
    endpoints: {
      "POST /orders": {
        description: "Create a new USDC to mobile money order",
        parameters: {
          amount: "number - Amount in USDC (e.g., 1)",
          phoneNumber: "string - Recipient phone number (e.g., '+254712345678')",
          accountName: "string - Recipient name",
          rate: "number - Exchange rate (KES/NGN per USDC)",
          returnAddress: "string - Sender's wallet address",
          currency: "string - Target currency ('KES' or 'NGN')"
        },
        example: {
          amount: 1,
          phoneNumber: "+254712345678",
          accountName: "John Doe",
          rate: 150.5,
          returnAddress: "0x742d35Cc6634C0532925a3b8D400b6b2e5e1C6eD",
          currency: "KES"
        },
        response: {
          success: true,
          order: {
            id: "order-uuid",
            receiveAddress: "0x...",
            validUntil: "ISO-date",
            senderFee: "0.01",
            transactionFee: "0.005",
            totalAmount: "1.015",
            status: "payment_order.pending"
          }
        }
      },
      "GET /orders": {
        description: "Get order status",
        parameters: {
          orderId: "string - PayCrest order ID"
        },
        example: "GET /api/paycrest/orders?orderId=order-uuid"
      },
      "GET /sender/stats": {
        description: "Get sender account statistics",
        response: {
          success: true,
          data: {
            totalOrders: 35,
            totalOrderVolume: "5",
            totalFeeEarnings: "0.0015"
          }
        }
      },
      "POST /webhook": {
        description: "PayCrest webhook handler (internal use)",
        note: "Handles PayCrest order status updates"
      }
    },
    supportedCurrencies: {
      KES: {
        providers: ["SAFARICOM", "AIRTEL"],
        description: "Kenyan Shillings via M-Pesa"
      },
      NGN: {
        providers: ["GTBNGLA"],
        description: "Nigerian Naira via bank transfer"
      }
    }
  };

  return NextResponse.json(documentation);
}