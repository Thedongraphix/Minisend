API Reference for Paycrest. Explore endpoints, request/response formats, and integration details.

Welcome to the Paycrest API Reference. Here you’ll find detailed documentation for all available endpoints, including request/response formats, authentication, and integration tips.
For a quick start, see the Quickstart guide.
For OpenAPI playground, see the interactive API explorer below (if available).
The Paycrest Aggregator API provides a comprehensive interface for interacting with the Paycrest protocol. This API enables senders to create payment orders, providers to fulfill orders, and general access to protocol information.
​
Base URL

Copy
# Production
https://api.paycrest.io/v1
​
Authentication
All API requests require authentication using an API key. Include your API key in the request header:

Copy
API-Key: YOUR_API_KEY
​
Getting Your API Key
Register at app.paycrest.io
Complete KYC verification (required for compliance)
Access your API key in your dashboard
Your API key should be kept secure and never shared publicly. It’s used to authenticate all API requests and identify your account.
​
API Endpoints
The Paycrest API is organized into three main categories:
​
Sender Endpoints
For entities that create payment orders:
POST /sender/orders - Create a new payment order
GET /sender/orders - List payment orders with filtering
GET /sender/orders/{id} - Get specific payment order details
GET /sender/stats - Get sender statistics
​
Provider Endpoints
For liquidity providers that fulfill orders:
GET /provider/orders - List available orders for fulfillment
GET /provider/rates/{token}/{fiat} - Get market rates
GET /provider/stats - Get provider statistics
GET /provider/node-info - Get node information
​
General Endpoints
For protocol information and utilities:
GET /currencies - List supported fiat currencies
GET /institutions/{currency_code} - List supported institutions
GET /tokens - List supported tokens
GET /rates/{token}/{amount}/{fiat} - Get token rates
GET /pubkey - Get aggregator public key
POST /verify-account - Verify bank account details
GET /orders/{chain_id}/{id} - Get lock payment order status
GET /reindex/{network}/{tx_hash} - Reindex transactions
​
Request Format
All requests should include the following headers:

Copy
Content-Type: application/json
API-Key: YOUR_API_KEY
​
Example Request
cURL
JavaScript
Python
Go

Copy
curl -X POST "https://api.paycrest.io/v1/sender/orders" \
  -H "Content-Type: application/json" \
  -H "API-Key: YOUR_API_KEY" \
  -d '{
    "amount": 100,
    "token": "USDT",
    "network": "base",
    "rate": 1.0,
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
Response Format
All API responses follow a consistent format:

Copy
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
​
Error Responses
Error responses include detailed information:

Copy
{
  "status": "error",
  "message": "Validation failed",
  "data": [
    {
      "field": "amount",
      "message": "Amount must be greater than 0"
    }
  ]
}
​
Rate Limiting
API requests are rate-limited to ensure fair usage:
Unauthenticated requests: 20 requests per second
Authenticated requests: 500 requests per second
​
Pagination
List endpoints support pagination with the following parameters:
page - Page number (default: 1)
pageSize - Items per page (default: 20, max: 100)
​
Example
cURL
JavaScript
Python
Go

Copy
curl -X GET "https://api.paycrest.io/v1/sender/orders?page=2&pageSize=10" \
  -H "API-Key: YOUR_API_KEY"
Response includes pagination metadata:

Copy
{
  "status": "success",
  "message": "Orders retrieved successfully",
  "data": {
    "total": 150,
    "page": 2,
    "pageSize": 10,
    "orders": [...]
  }
}
​
Webhooks
Set up webhooks to receive real-time updates:
​
Webhook Events
order.initiated - Order initiated via API (before Gateway creation)
order.pending - Order awaiting provider assignment
order.validated - Order validated and ready for settlement
order.settled - Order settled on blockchain
order.refunded - Order refunded to sender
order.expired - Order expired because no transfer was made to the receive address within the time limit
​
Webhook Payload

Copy
{
  "event": "order.settled",
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "settled",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "txHash": "0x1234567890abcdef...",
    "providerId": "provider-123",
    "settlementAmount": "50000"
  }
}
For detailed webhook implementation guide including signature verification, retry logic, and best practices, see the Sender API Integration Guide.
​
Testing
Paycrest supports very low minimum orders (as little as $0.50) and uses cost-effective EVM L2s, making it perfect for testing with real transactions. Start small and scale up as you gain confidence.
There is no sandbox environment at the moment. All testing should be done on production using small amounts.