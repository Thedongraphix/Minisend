import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const documentation = {
    title: "Minisend PayCrest API Documentation",
    version: "2.0.0",
    baseUrl: "https://minisend.xyz/api/paycrest",
    research_findings: {
      webhook_limitations: {
        title: "PayCrest Webhook Limitations",
        description: "Research reveals that PayCrest does not provide webhook notifications for order lifecycle events. Unlike established payment processors, PayCrest relies on polling-based status monitoring.",
        implications: [
          "Webhook endpoint /api/paycrest/webhook will receive no events from PayCrest",
          "Cannot rely on webhook notifications for payment completion detection",
          "Polling is the only reliable method for monitoring order status changes"
        ],
        solution: "Intelligent polling with exponential backoff focused on 'settled' status detection"
      },
      settlement_detection: {
        title: "Settlement Detection Strategy",
        description: "Payment completion is detected when order.status === 'settled'. This status definitively indicates successful fiat delivery to recipient.",
        key_statuses: {
          "settled": "Payment fully completed - fiat delivered to recipient",
          "failed": "Payment processing failed",
          "cancelled": "Order was cancelled",
          "initiated": "Order created, waiting for crypto deposit",
          "pending": "Order is pending processing"
        }
      }
    },
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
            status: "initiated"
          }
        }
      },
      "GET /status/[orderId]": {
        description: "Get order status with settlement detection",
        note: "RESEARCH-BASED: Primary method for monitoring payment completion",
        parameters: {
          orderId: "string - PayCrest order ID"
        },
        example: "GET /api/paycrest/status/order-uuid",
        response: {
          success: true,
          order: {
            id: "order-uuid",
            status: "settled",
            isSettled: true,
            isFailed: false,
            isProcessing: false,
            settledAt: "2024-01-15T10:30:00Z"
          }
        }
      },
      "GET /orders": {
        description: "Get order status (legacy endpoint)",
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
        description: "PayCrest webhook handler (compatibility only)",
        note: "RESEARCH-BASED: PayCrest does not send webhook events. This endpoint exists for compatibility but relies on polling for status updates.",
        research_note: "PayCrest webhooks are not implemented - use polling instead"
      }
    },
    polling_implementation: {
      title: "Intelligent Polling Implementation",
      description: "Research-based polling solution with exponential backoff and proper timeout handling",
      features: [
        "Exponential backoff starting at 3 seconds",
        "Maximum 20 polling attempts",
        "10-minute timeout limit",
        "Focus on 'settled' status for completion detection",
        "Fallback to database if API fails"
      ],
      code_example: `
const pollPayCrestOrder = async (orderId, maxAttempts = 20) => {
  const baseDelay = 3000;
  const timeoutMs = 600000;
  
  while (attempts < maxAttempts) {
    const response = await fetch(\`/api/paycrest/status/\${orderId}\`);
    const result = await response.json();
    const order = result.order;
    
    if (order.status === 'settled') {
      return { success: true, completed: true, order };
    }
    
    if (['failed', 'cancelled'].includes(order.status)) {
      return { success: false, completed: true, order };
    }
    
    const delay = Math.min(baseDelay * Math.pow(1.4, attempts), 30000);
    await new Promise(resolve => setTimeout(resolve, delay));
    attempts++;
  }
};
      `
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
    },
    best_practices: {
      title: "Best Practices for PayCrest Integration",
      recommendations: [
        "Remove webhook dependency - PayCrest doesn't send webhook events",
        "Implement polling using the provided patterns",
        "Check for 'settled' status only - ignore intermediate states for completion",
        "Add timeout handling - don't poll indefinitely",
        "Provide progress feedback - show users what's happening during processing"
      ]
    }
  };

  return NextResponse.json(documentation);
}