Integrate with Paycrest using the Sender API for initiating payment orders via REST API.

ℹ️ Note: Paycrest currently supports stablecoin-to-fiat (offramp) transactions only. Fiat-to-stablecoin (onramp) is coming in Q3 2025.
In this guide, we demonstrate how to enable off-ramps for users with the Sender API. The main difference between the Sender API and the Gateway contract is that users get a receiving address to pay for rather than connecting their non-custodial wallets. This means users can off-ramp directly from any wallet.
​
Getting Started
​
Step 1: Obtain API Credentials
First, you need to get the Client ID from your sender dashboard.
Visit your Sender Dashboard to retrieve your Client ID and Client Secret. If you’re a new user, sign up as a “sender” and complete our Know-Your-Business (KYB) process. Your Client Secret should always be kept secret - we’ll get to this later in the article.
​
Step 2: Configure Tokens
Head over to the settings page of your Sender Dashboard to configure the feePercent, feeAddress, and refundAddress across the tokens and blockchain networks you intend to use.
​
Step 3: Authentication Setup
Include your Client ID in the “API-Key” header of every request you make to Paycrest Offramp API.

Copy
const headers = {
  "API-Key": "208a4aef-1320-4222-82b4-e3bca8781b4b",
};

This is because requests without a valid API key will fail with status code 401: Unauthorized.
​
Creating Payment Orders
​
Basic Order Creation
cURL
JavaScript
Python
Go

Copy
curl -X POST "https://api.paycrest.io/v1/orders" \
  -H "API-Key: YOUR_CLIENT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "100",
    "token": "USDT",
    "network": "base",
    "rate": "1.0",
    "recipient": {
      "institution": "GTB",
      "accountIdentifier": "1234567890",
      "accountName": "John Doe",
      "currency": "NGN",
      "memo": "Salary payment for January 2024"
    },
    "reference": "payment-123",
    "returnAddress": "0x1234567890123456789012345678901234567890"
  }'
​
Handle the Response
JavaScript
Python
Go

Copy
// The response includes important information
const {
  id,              // Order ID for tracking
  receiveAddress,  // Address to send tokens to
  validUntil,      // Expiration time
  senderFee,       // Fee amount
  transactionFee   // Network transaction fee
} = order;

// Store the order ID for tracking
await saveOrderToDatabase(order.id, order);
​
Send Tokens to Receive Address
JavaScript
Python
Go

Copy
// Using viem to send tokens
import { createPublicClient, createWalletClient, http, getContract, parseUnits } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org')
});

const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http('https://mainnet.base.org')
});

// USDT contract on Base
const usdtContract = getContract({
  address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', // USDT on Base
  abi: [{
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable'
  }],
  publicClient,
  walletClient
});

// Send tokens to the receive address
const { request } = await usdtContract.simulate.transfer({
  args: [order.receiveAddress, parseUnits(order.amount, 6)] // USDT has 6 decimals
});

const hash = await walletClient.writeContract(request);
console.log('Transaction hash:', hash);
The amount you send to the receive address should be the sum of amount, senderFee, and transactionFee as returned in the order response.
​
Order Status Monitoring
Your status can either be any of the following:
payment_order.pending - Order created, waiting for provider assignment
payment_order.validated - Funds have been sent to recipient’s bank/mobile network (value transfer confirmed)
payment_order.expired - Order expired without completion
payment_order.settled - Order fully completed on blockchain
payment_order.refunded - Funds refunded to sender
Once you deploy your server and get the endpoint, you can listen to payment order events by configuring the Webhook URL in your dashboard settings. We trigger various events based on the status of the payment order. Our webhook events are sent exponentially until 24 hours from when the first one is sent.
If pending, your frontend would have to continue polling till it gets back a conclusive response - either validated, expired, or refunded.
You can tell your user the transaction was successful (or provide value) at the validated status, since this indicates funds have been sent to the recipient’s bank/mobile network. The settled status occurs when the provider has received the stablecoin on-chain, which is separate from the sender-to-recipient money flow.
​
Webhook Implementation
JavaScript
Python
Go

Copy
// Server setup and webhook endpoint
app.post("/webhook", async (req, res, next) => {
  const signature = req.get("X-Paycrest-Signature");
  if (!signature) return false;

  if (!verifyPaycrestSignature(req.body, signature, process.env.CLIENT_SECRET!)) {
    return res.status(401).send("Invalid signature");
  }
  console.log("Webhook received:", req.body);
  try {
    const transaction = await prisma.transaction.create({
      data: {
        id: req.body.data.id,
        status: req.body.event,
      },
    });
    res.json({ data: transaction });
  } catch (err) {
    next(err);
  }
  res.status(200).send("Webhook received");
});

function verifyPaycrestSignature(requestBody, signatureHeader, secretKey) {
  const calculatedSignature = calculateHmacSignature(requestBody, secretKey);
  return signatureHeader === calculatedSignature;
}

function calculateHmacSignature(data, secretKey) {
  const crypto = require('crypto');
  const key = Buffer.from(secretKey);
  const hash = crypto.createHmac("sha256", key);
  hash.update(data);
  return hash.digest("hex");
}
Webhook URLs are configured through the Sender Dashboard settings, not via API. Visit your dashboard to set up your webhook endpoint URL.
​
Polling Implementation
JavaScript
Python
Go

Copy
// Status polling endpoint
app.get("/transactions/:id", async (req, res, next) => {
  const { id } = req.params;
  const transaction = await prisma.transaction.findUnique({
    where: { id },
  });
  res.json({ data: transaction ? transaction : 'Non-existent transaction' });
});

// Poll for status updates
async function checkOrderStatus(orderId) {
  try {
    const response = await fetch(`https://api.paycrest.io/v1/orders/${orderId}`, {
      headers: { "API-Key": "YOUR_CLIENT_ID" }
    });
    const order = await response.json();
    switch (order.status) {
      case 'pending':
        console.log('Order is pending provider assignment');
        break;
      case 'validated':
        console.log('Funds have been sent to recipient\'s bank/mobile network (value transfer confirmed)');
        await handleOrderValidated(order);
        break;
      case 'settled':
        console.log('Order has been settled on blockchain');
        await handleOrderSettled(order);
        break;
      case 'refunded':
        console.log('Order was refunded to the sender');
        await handleOrderRefunded(order);
        break;
      case 'expired':
        console.log('Order expired without completion');
        await handleOrderExpired(order);
        break;
    }
    return order;
  } catch (error) {
    console.error('Error checking order status:', error);
    throw error;
  }
}
​
Error Handling
​
API Error Handling
JavaScript
Python
Go
cURL

Copy
async function createPaymentOrder(orderData) {
  try {
    const response = await fetch("https://api.paycrest.io/v1/sender/orders", {
      method: "POST",
      headers: {
        "API-Key": "YOUR_CLIENT_ID",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(orderData)
    });
    
    if (!response.ok) {
      if (response.status === 400) {
        // Validation error
        const validationErrors = await response.json();
        throw new Error(`Validation failed: ${JSON.stringify(validationErrors)}`);
      } else if (response.status === 401) {
        // Authentication error
        throw new Error('Invalid API key');
      } else if (response.status === 429) {
        // Rate limit exceeded
        throw new Error('Rate limit exceeded. Please try again later.');
      } else {
        // Other errors
        throw new Error(`API error: ${response.statusText}`);
      }
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating payment order:', error);
    throw error;
  }
}
​
Retry Logic
JavaScript
Python
Go
cURL

Copy
async function createOrderWithRetry(orderData, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await createPaymentOrder(orderData);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
​
Production Considerations
​
Security Best Practices
JavaScript
Python
Go
cURL

Copy
// Use environment variables for sensitive data
const config = {
  apiKey: process.env.PAYCREST_API_KEY,
  webhookSecret: process.env.PAYCREST_WEBHOOK_SECRET
};

// Validate webhook signatures
app.post('/webhooks/paycrest', async (req, res) => {
  const signature = req.headers['x-paycrest-signature'];
  
  if (!validateWebhookSignature(req.body, signature, config.webhookSecret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook
  // ...
});
​
Database Integration
JavaScript
Python
Go

Copy
// Example with PostgreSQL
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function saveOrder(order) {
  const query = `
    INSERT INTO payment_orders (
      id, amount, token, network, status, 
      recipient_institution, recipient_account, recipient_name,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `;
  
  await pool.query(query, [
    order.id,
    order.amount,
    order.token,
    order.network,
    order.status,
    order.recipient.institution,
    order.recipient.accountIdentifier,
    order.recipient.accountName,
    new Date(),
    new Date()
  ]);
}
​
Testing
​
Unit Tests
JavaScript
Python
Go

Copy
// Using Jest for testing
describe('Paycrest Sender API Integration', () => {
  test('should create payment order successfully', async () => {
    const orderData = {
      amount: '100',
      token: 'USDT',
      network: 'base',
      recipient: {
        institution: 'GTB',
        accountIdentifier: '1234567890',
        accountName: 'Test User',
        currency: 'NGN'
      }
    };
    
    const order = await createPaymentOrder(orderData);
    
    expect(order.id).toBeDefined();
    expect(order.receiveAddress).toBeDefined();
    expect(order.status).toBe('pending');
  });
  
  test('should handle API errors gracefully', async () => {
    const invalidOrderData = {
      amount: '-100', // Invalid amount
      token: 'USDT',
      network: 'base'
    };
    
    await expect(createPaymentOrder(invalidOrderData))
      .rejects
      .toThrow('Validation failed');
  });
});
​
Deployment Checklist
Before going live, ensure you have:
 KYC verification completed
 API credentials generated and secured
 Webhook endpoints configured and tested
 Error handling implemented
 Monitoring and logging set up
 Database schema created
 Rate limiting configured
 Security measures implemented
 Testing completed with small amounts
 Documentation updated
This backend structure can be done in any custom way depending on your app as long as the webhook validates and stores the correct payload sent to it.
Choose this method if you want a simple, offchain integration for your platform or business.

NEW UPDATES

Get started with Paycrest in minutes - Learn how to create payment orders and integrate with the API

This guide will walk you through creating your first payment order and integrating with the Paycrest API.
​
Prerequisites
Before you begin, make sure you have:
A Paycrest account with API access
KYC verification completed (required for all participants)
API credentials (API key and secret)
Basic knowledge of REST APIs
Get API Credentials

KYC Requirements

​
Create Your First Payment Order
Let’s create a simple payment order to send USDT to a Nigerian bank account.
​
Step 1: Get Exchange Rate
cURL
JavaScript
Python
Go

Copy
curl -X GET "https://api.paycrest.io/v1/rates/USDT/100/NGN" \
  -H "API-Key: YOUR_API_KEY"
Response:

Copy
{
  "status": "success",
  "message": "Rate fetched successfully",
  "data": "1250.50"
}
Always fetch the latest rate before creating a payment order. Rates can change frequently, and using an outdated rate may cause your order to be refunded.
1
Get Exchange Rate

Fetch the current exchange rate for your token and currency pair.
2
Prepare Your Request

Set up your API key and prepare the payment order data with recipient details.
3
Send the Request

Make a POST request to the orders endpoint with your payment details.
4
Handle the Response

Process the response to get your order ID and payment instructions.
5
Monitor Status

Track your order status and handle webhooks for real-time updates.
​
Step 2: Create Payment Order
cURL
JavaScript
Python
Go

Copy
curl -X POST "https://api.paycrest.io/v1/sender/orders" \
  -H "API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "100",
    "token": "USDT",
    "network": "base",
    "rate": "1250.50",
    "recipient": {
      "institution": "GTB",
      "accountIdentifier": "1234567890",
      "accountName": "John Doe",
      "currency": "NGN",
      "memo": "Salary payment for January 2024"
    },
    "reference": "payment-123",
    "returnAddress": "0x1234567890123456789012345678901234567890"
  }'
​
Response

Copy
{
  "status": "success",
  "message": "Payment order initiated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "amount": "100",
    "token": "USDT",
    "network": "base",
    "receiveAddress": "0x9876543210987654321098765432109876543210",
    "validUntil": "2024-01-15T10:30:00Z",
    "senderFee": "0.5",
    "transactionFee": "2.5",
    "reference": "payment-123"
  }
}
​
Check Order Status
cURL
JavaScript
Python
Go

Copy
curl -X GET "https://api.paycrest.io/v1/sender/orders/550e8400-e29b-41d4-a716-446655440000" \
  -H "API-Key: YOUR_API_KEY"
Order Statuses
pending: Order created, waiting for provider assignment
processing: Provider assigned, fulfillment in progress
fulfilled: Payment completed by provider
validated: Payment validated and confirmed
settled: Order fully completed on blockchain
cancelled: Order cancelled (with reason)
refunded: Funds refunded to sender
Response Time
Order Processing: < 30 seconds (creation → validation)
Settlement: +15 seconds (onchain settlement)
Total Time: ~1-2 minutes
Auto-Refund: If not completed within 5 minutes
​
Handle Webhooks (Optional)
Set up webhooks to receive real-time updates through your Sender dashboard:
Log into your Sender dashboard at app.paycrest.io
Navigate to Settings → Webhooks
Enter your webhook URL (e.g., https://your-domain.com/webhooks/paycrest)
Save the configuration
Your webhook endpoint will receive notifications for all order status changes automatically.
​
Webhook Payload Example

Copy
{
  "event": "order.fulfilled",
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "fulfilled",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "txHash": "0x1234567890abcdef...",
    "providerId": "provider-123",
    "settlementAmount": "50000"
  }
}
​
Get Supported Currencies
Check available currencies and institutions:

Copy
# Get supported currencies
curl -X GET "https://api.paycrest.io/v1/currencies"

# Get institutions for a currency
curl -X GET "https://api.paycrest.io/v1/institutions/NGN"
​
