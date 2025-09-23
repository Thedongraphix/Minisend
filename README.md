# Minisend - USDC to Mobile Money Platform

A production-ready USDC to mobile money platform built on Base Network, enabling seamless conversion of cryptocurrency to local currencies in Kenya and Nigeria.

## 🚀 Features

- **USDC to Mobile Money**: Convert USDC to KES (M-Pesa) or NGN (Bank Transfer)
- **Base Network Integration**: Built on Coinbase's Base Network for fast, low-cost transactions
- **Multi-Wallet Support**: MetaMask, Coinbase Wallet, Phantom, Rabby, Trust, Frame
- **Enterprise-Grade Security**: OnchainKit integration with proper error handling
- **🗄️ Complete Database Integration**: Automatic payment tracking with Supabase
- **📊 Analytics & Reporting**: Real-time insights and payment analytics
- **🕐 EAT Timezone Support**: All timestamps in East Africa Time
- **📱 Carrier Detection**: Automatic Kenyan phone carrier identification
- **💬 WhatsApp Support**: Floating WhatsApp icon for instant customer support

## 🌍 Supported Regions

### Kenya 🇰🇪
- **M-Pesa Integration**: Direct transfers to M-Pesa wallets
- **Multiple Carriers**: Safaricom and Airtel support
- **Real-time Rates**: Live USD to KES conversion

### Nigeria 🇳🇬
- **Bank Integration**: Direct transfers to Nigerian bank accounts
- **Multiple Banks**: Support for major Nigerian banks including GTBank
- **Real-time Rates**: Live USD to NGN conversion

## 🛠️ Technical Implementation

### Intelligent Payment Processing

The platform implements intelligent payment processing with real-time status monitoring:

```javascript
const processPayment = async (orderData) => {
  // Create payment order
  const order = await createOrder(orderData);

  // Monitor payment status with intelligent polling
  const result = await monitorPaymentStatus(order.id);

  // Handle completion or failure
  if (result.success) {
    return { success: true, order: result.order };
  }

  return { success: false, error: result.error };
};
```

**Processing Features:**
- Real-time status monitoring
- Exponential backoff for optimal performance
- Comprehensive error handling
- Progress feedback for users
- Automatic timeout management


## 🗄️ Database Integration

### Automatic Payment Tracking
All payment data is automatically recorded in Supabase with EAT timezone:

- **Order Details**: Amount, currency, phone numbers, wallet addresses
- **Status History**: Complete audit trail of all status changes
- **Analytics Events**: User interactions and conversion tracking
- **Carrier Detection**: Automatic phone number carrier identification
- **Transaction Logs**: Complete transaction history for debugging

### Database Setup
```bash
# Setup database tables and views
npm run setup-supabase

# Test database connection
npm run test-db-quick

# Full integration test
npm run test-db-full
```

### Analytics Views
- `order_analytics` - Daily summaries with success rates
- `settlement_analytics` - Settlement timing and performance
- `fee_analytics` - Fee breakdown by type and currency
- `status_analytics` - Status transition tracking

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Base Network RPC endpoint
- Supabase account (for database)

### Environment Variables

```bash
# API Configuration
API_KEY=your_api_key
CLIENT_SECRET=your_client_secret
BASE_URL=your_api_base_url

# Database
DATABASE_URL=your_supabase_database_url
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

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

```

## 🔧 Architecture

### Frontend Components

- `SimpleUSDCPayment.tsx` - Main payment component with intelligent processing
- `SimpleOffRampFlow.tsx` - Complete off-ramp flow
- `DirectUSDCBalance.tsx` - USDC balance display
- `WhatsAppFloatingIcon.tsx` - Customer support integration
- `DemoComponents.tsx` - UI components and styling

### Backend Services

- Payment API integration with intelligent monitoring
- Database integration for order tracking
- Analytics and reporting services
- Rate fetching and validation
- Real-time status updates

### Key Features

1. **Intelligent Processing**: Smart payment monitoring with real-time updates
2. **Settlement Detection**: Accurate payment completion detection
3. **Error Handling**: Comprehensive error handling with user feedback
4. **Progress Tracking**: Real-time progress updates during payment processing
5. **Timeout Management**: Optimal timeout handling with graceful degradation

## 🎯 Best Practices

### For Payment Integration

1. **Real-time monitoring** - Implement proper status checking
2. **User feedback** - Provide clear progress indicators
3. **Error handling** - Handle all edge cases gracefully
4. **Timeout management** - Don't process indefinitely
5. **Security** - Validate all inputs and sanitize data

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
- **NGN (Nigerian Naira)**: Via bank transfer (multiple banks)

## 🔍 Monitoring and Analytics

The platform includes comprehensive monitoring:

- Order creation and status tracking
- Payment completion analytics
- Error tracking and reporting
- Carrier detection for Kenyan numbers
- Settlement time monitoring
- User behavior analytics

## 🚨 Troubleshooting

### Common Issues

1. **Payment Processing**: Ensure proper wallet connection and sufficient USDC balance
2. **Network Issues**: Check Base Network connectivity and RPC endpoints
3. **Rate Errors**: Verify exchange rate API availability
4. **Order Status**: Check order ID validity and API credentials

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` and check console logs for detailed information about payment processing and status changes.

## 💬 Support

Need help? Click the floating WhatsApp icon in the app for instant support, or contact us through the following channels:

- WhatsApp: Available via in-app floating icon
- Email: support@minisend.xyz
- Documentation: Check the in-app help section

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests if applicable
5. Submit a pull request

---

**Built with ❤️ on Base Network using OnchainKit**

*Empowering seamless crypto-to-fiat conversions across Africa*