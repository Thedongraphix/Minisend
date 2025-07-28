# Minisend - USDC to Mobile Money Platform

A production-ready USDC to mobile money platform built on Base Network, featuring PayCrest integration with research-based polling implementation.

## 🚀 Features

- **USDC to Mobile Money**: Convert USDC to KES (M-Pesa) or NGN (Bank Transfer)
- **Base Network Integration**: Built on Coinbase's Base Network
- **Multi-Wallet Support**: MetaMask, Coinbase Wallet, Phantom, Rabby, Trust, Frame
- **Research-Based PayCrest Integration**: Intelligent polling with settlement detection
- **Enterprise-Grade Security**: OnchainKit integration with proper error handling

## 🔬 Research-Based Implementation

### PayCrest Webhook Limitations

**Critical Discovery**: PayCrest does not provide webhook notifications for order lifecycle events. Unlike established payment processors, PayCrest relies on polling-based status monitoring.

**What This Means:**
- Webhook endpoint `/api/paycrest/webhook` will receive no events from PayCrest
- Cannot rely on webhook notifications for payment completion detection
- **Polling is the only reliable method** for monitoring order status changes

### Settlement Detection Strategy

Payment completion is detected when `order.status === 'settled'`. This status definitively indicates successful fiat delivery to recipient.

**Key Status Values:**
- `"settled"` - Payment fully completed - fiat delivered to recipient
- `"failed"` - Payment processing failed
- `"cancelled"` - Order was cancelled
- `"initiated"` - Order created, waiting for crypto deposit
- `"pending"` - Order is pending processing

## 🛠️ Technical Implementation

### Intelligent Polling System

The platform implements research-based polling with exponential backoff:

```javascript
const pollPayCrestOrder = async (orderId, maxAttempts = 20) => {
  const baseDelay = 3000; // Start with 3 second intervals
  const timeoutMs = 600000; // 10 minutes maximum
  
  while (attempts < maxAttempts) {
    const response = await fetch(`/api/paycrest/status/${orderId}`);
    const result = await response.json();
    const order = result.order;
    
    // Check for definitive completion states
    if (order.status === 'settled') {
      return { success: true, completed: true, order };
    }
    
    if (['failed', 'cancelled'].includes(order.status)) {
      return { success: false, completed: true, order };
    }
    
    // Exponential backoff
    const delay = Math.min(baseDelay * Math.pow(1.4, attempts), 30000);
    await new Promise(resolve => setTimeout(resolve, delay));
    attempts++;
  }
};
```

**Polling Features:**
- Exponential backoff starting at 3 seconds
- Maximum 20 polling attempts
- 10-minute timeout limit
- Focus on 'settled' status for completion detection
- Fallback to database if API fails

## 📋 API Endpoints

### Core Endpoints

- `POST /api/paycrest/orders` - Create payment order
- `GET /api/paycrest/status/[orderId]` - Get order status with settlement detection
- `GET /api/paycrest/rates` - Get exchange rates
- `GET /api/paycrest/sender/stats` - Get sender statistics

### Documentation

- `GET /api/paycrest/orders-docs` - Complete API documentation with research findings

### Webhook (Compatibility Only)

- `POST /api/paycrest/webhook` - PayCrest webhook handler (compatibility only)

**Note**: PayCrest does not send webhook events. This endpoint exists for compatibility but relies on polling for status updates.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PayCrest API credentials
- Base Network RPC endpoint

### Environment Variables

```bash
# PayCrest Configuration
PAYCREST_API_KEY=your_api_key
PAYCREST_CLIENT_SECRET=your_client_secret
PAYCREST_BASE_URL=https://api.paycrest.io/v1

# Database (Optional)
DATABASE_URL=your_database_url

# App Configuration
NEXT_PUBLIC_URL=http://localhost:3000
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 🧪 Testing

### Test PayCrest Integration

```bash
# Test order creation
curl -X POST http://localhost:3000/api/paycrest/orders \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "1",
    "phoneNumber": "+254712345678",
    "accountName": "Test User",
    "currency": "KES",
    "returnAddress": "0x742d35Cc6634C0532925a3b8D400b6b2e5e1C6eD"
  }'

# Test status polling
curl http://localhost:3000/api/paycrest/status/order-id

# Test documentation
curl http://localhost:3000/api/paycrest/orders-docs
```

## 🔧 Architecture

### Frontend Components

- `SimpleUSDCPayment.tsx` - Main payment component with research-based polling
- `SimpleOffRampFlow.tsx` - Complete off-ramp flow
- `DirectUSDCBalance.tsx` - USDC balance display
- `DemoComponents.tsx` - UI components and styling

### Backend Services

- PayCrest API integration with intelligent polling
- Database integration for order tracking
- Analytics and webhook services
- Rate fetching and validation

### Key Features

1. **Research-Based Polling**: Intelligent status monitoring with exponential backoff
2. **Settlement Detection**: Focus on 'settled' status for payment completion
3. **Error Handling**: Comprehensive error handling with user feedback
4. **Progress Tracking**: Real-time progress updates during payment processing
5. **Timeout Management**: 10-minute maximum polling with graceful degradation

## 🎯 Best Practices

### For PayCrest Integration

1. **Remove webhook dependency** - PayCrest doesn't send webhook events
2. **Implement polling** using the provided patterns
3. **Check for 'settled' status only** - ignore intermediate states for completion
4. **Add timeout handling** - don't poll indefinitely
5. **Provide progress feedback** - show users what's happening during processing

### For Production Deployment

1. **Environment Configuration**: Set up proper environment variables
2. **Database Setup**: Configure database for order tracking
3. **Monitoring**: Implement logging and monitoring
4. **Security**: Validate all inputs and handle errors gracefully
5. **Testing**: Test with small amounts before going live

## 📊 Supported Networks

- **Base Network**: Primary network for USDC transactions
- **Base Sepolia**: Testnet for development and testing

## 💰 Supported Currencies

- **KES (Kenyan Shillings)**: Via M-Pesa (Safaricom, Airtel)
- **NGN (Nigerian Naira)**: Via bank transfer (GTBank)

## 🔍 Monitoring and Analytics

The platform includes comprehensive monitoring:

- Order creation and status tracking
- Payment completion analytics
- Error tracking and reporting
- Carrier detection for Kenyan numbers
- Settlement time monitoring

## 🚨 Troubleshooting

### Common Issues

1. **Spinning UI**: Ensure polling is properly implemented and checking for 'settled' status
2. **Timeout Errors**: Check network connectivity and PayCrest API status
3. **Order Not Found**: Verify order ID and API credentials
4. **Payment Failures**: Check recipient details and network status

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` and check console logs for detailed information about polling attempts and status changes.

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions about the PayCrest integration:

- Check the API documentation at `/api/paycrest/orders-docs`
- Review the research findings in the documentation
- Test with the provided endpoints
- Monitor logs for detailed error information

---

**Built with ❤️ on Base Network using OnchainKit**

# Trigger deployment
