# Minisend

**A comprehensive USDC-to-fiat offramp solution for creators and builders on Farcaster and Base Network**

Minisend enables seamless conversion of USDC to local currencies (KES, NGN) through an intuitive miniapp interface, specifically designed for the Farcaster ecosystem and Base Network builders.

## Overview

Minisend serves as a critical financial infrastructure component for the Farcaster creator economy and Base Network ecosystem. By providing instant USDC-to-fiat conversion capabilities, it enables creators, builders, and businesses to monetize their on-chain activities and convert cryptocurrency earnings into usable local currencies.

### For Farcaster Creators
- **Direct monetization**: Convert Frame tips, token rewards, and creator earnings to local currency
- **Seamless integration**: Native Farcaster miniapp with one-click access
- **Creator-focused**: Designed for content creators, builders, and community managers
- **Global reach**: Support for key African markets (Kenya, Nigeria) with expansion planneds

### For Base Network Builders
- **Developer tools**: API access for integrating offramp functionality into dApps
- **Business solutions**: Enable businesses to accept USDC and pay suppliers in local currency
- **Gasless transactions**: Free transaction fees using Base Network paymaster integration
- **Enterprise-grade**: Production-ready infrastructure with comprehensive monitoring

## Key Features

**Multi-Currency Support**
- Kenya: USDC to KES via M-Pesa (Safaricom, Airtel)
- Nigeria: USDC to NGN via direct bank transfers
- Real-time exchange rates with transparent fee structure

**Platform Integration**
- Native Farcaster miniapp with Frame compatibility
- Base Network optimized for fast, low-cost transactions
- OnchainKit integration for enterprise-grade security
- Multi-wallet support (MetaMask, Coinbase Wallet, Rainbow, etc.)

**Developer Infrastructure**
- RESTful API for custom integrations
- Webhook support for real-time status updates
- Comprehensive analytics and reporting
- Database integration with automated tracking

**User Experience**
- One-click conversion from Farcaster
- Real-time transaction monitoring
- Mobile-optimized interface
- Transparent fee breakdown

## Supported Regions

### Kenya
- **Payment Method**: M-Pesa direct transfers
- **Carriers**: Safaricom, Airtel Money
- **Currency**: Kenyan Shillings (KES)
- **Settlement**: Near-instant mobile wallet delivery

### Nigeria
- **Payment Method**: Direct bank transfers
- **Banks**: All major Nigerian banks (GTBank, Zenith, UBA, etc.)
- **Currency**: Nigerian Naira (NGN)
- **Settlement**: Same-day bank account delivery

## Technical Architecture

### Frontend Components
- **ExchangeFlow**: Complete USDC-to-fiat conversion interface
- **SpendFlow**: Business payment processing for till numbers
- **PaymentProcessor**: Core transaction handling with real-time monitoring
- **BalanceView**: USDC balance display with Base Network integration

### Backend Services
- **Payment API**: Intelligent order processing with status monitoring
- **Database Layer**: Comprehensive tracking with Supabase integration
- **Analytics Engine**: Real-time reporting and conversion metrics
- **Rate Management**: Live exchange rate fetching and validation

## Tech Stack

<div align="center">

### Frontend & Framework
![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

### Blockchain & Web3
![Base Network](https://img.shields.io/badge/Base_Network-0052FF?style=for-the-badge&logo=coinbase&logoColor=white)
![OnchainKit](https://img.shields.io/badge/OnchainKit-1652F0?style=for-the-badge&logo=coinbase&logoColor=white)
![Wagmi](https://img.shields.io/badge/Wagmi-1C1B1B?style=for-the-badge&logo=ethereum&logoColor=white)
![Viem](https://img.shields.io/badge/Viem-000000?style=for-the-badge&logo=ethereum&logoColor=white)

### Database & Backend
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

### APIs & Integrations
![PayCrest](https://img.shields.io/badge/PayCrest_API-FF6B35?style=for-the-badge&logo=api&logoColor=white)
![PostHog](https://img.shields.io/badge/PostHog-FF3A00?style=for-the-badge&logo=posthog&logoColor=white)
![Farcaster](https://img.shields.io/badge/Farcaster-8A63D2?style=for-the-badge&logo=farcaster&logoColor=white)

### Development & Tools
![ESLint](https://img.shields.io/badge/ESLint-4B3263?style=for-the-badge&logo=eslint&logoColor=white)
![Git](https://img.shields.io/badge/git-%23F05033.svg?style=for-the-badge&logo=git&logoColor=white)
![npm](https://img.shields.io/badge/NPM-%23CB3837.svg?style=for-the-badge&logo=npm&logoColor=white)

</div>

### Architecture Overview
- **Base Network**: Layer 2 solution for fast, low-cost USDC transactions
- **OnchainKit**: Coinbase's toolkit for wallet connections and transactions
- **PayCrest API**: Banking infrastructure for fiat settlements
- **Supabase**: Real-time database with analytics capabilities
- **Next.js 15**: Modern React framework with App Router

## Getting Started

### Environment Setup

```bash
# API Configuration
API_KEY=your_paycrest_api_key
CLIENT_SECRET=your_paycrest_secret
BASE_URL=https://api.paycrest.io

# Database Configuration
DATABASE_URL=your_supabase_database_url
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Application Configuration
NEXT_PUBLIC_URL=https://your-domain.com
NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_id
```

### Installation

```bash
# Install dependencies
npm install

# Setup database tables
npm run setup-supabase

# Run development server
npm run dev

# Build for production
npm run build
```

### Database Testing

```bash
# Quick connectivity test
npm run test-db-quick

# Comprehensive integration test
npm run test-db-full
```

## API Integration

### Creating Payment Orders

```javascript
// Create a USDC-to-fiat conversion order
const response = await fetch('/api/paycrest/orders/simple', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: '10.00',        // USDC amount
    phoneNumber: '+254712345678', // Kenya M-Pesa
    accountName: 'John Doe',
    currency: 'KES',
    returnAddress: walletAddress
  })
});

const { success, order } = await response.json();
```

### Monitoring Transaction Status

```javascript
// Check payment status
const statusResponse = await fetch(`/api/paycrest/status/${orderId}`);
const { order } = await statusResponse.json();

// Status values: pending, validated, settled, refunded, expired
console.log('Payment status:', order.status);
```

## Database Schema

### Core Tables
- **payment_orders**: Complete order tracking with metadata
- **order_analytics**: Daily summaries and success rates
- **settlement_analytics**: Settlement timing and performance
- **fee_analytics**: Fee breakdown by currency and type
- **status_analytics**: Status transition monitoring

### Analytics Views
The platform provides comprehensive analytics through automated database views:

```sql
-- Daily performance metrics
SELECT * FROM order_analytics
WHERE date = CURRENT_DATE;

-- Settlement performance
SELECT * FROM settlement_analytics
WHERE currency = 'KES';
```

## Deployment

### Production Checklist

1. **Environment Variables**: Configure all required API keys and database URLs
2. **Database Setup**: Run migration scripts and verify connectivity
3. **Network Configuration**: Ensure Base Network RPC access
4. **Monitoring Setup**: Configure logging and error tracking
5. **Security Review**: Validate input sanitization and error handling

### Recommended Architecture

```
Internet → Vercel/Netlify → Next.js App → Supabase Database
                        ↘ PayCrest API
                        ↘ Base Network RPC
```

## Monitoring and Analytics

### Key Metrics Tracked
- **Conversion Rates**: USDC-to-fiat conversion success rates
- **Settlement Times**: Average time from order to fiat delivery
- **Geographic Distribution**: Usage patterns by country/region
- **User Behavior**: Flow completion rates and drop-off points
- **Error Tracking**: Failed transactions with categorized error types

### Real-time Monitoring
- Order creation and status progression
- Payment completion analytics with settlement verification
- Error rate monitoring with automatic alerting
- Performance metrics for API response times

## Support and Documentation

### Developer Resources
- **API Documentation**: Comprehensive endpoint documentation
- **Integration Guides**: Step-by-step integration tutorials
- **Code Examples**: Ready-to-use code snippets
- **Testing Tools**: Sandbox environment for safe testing

### Community Support
- **GitHub Issues**: Bug reports and feature requests
- **Developer Discord**: Real-time support and community discussion
- **Documentation Site**: Comprehensive guides and tutorials

## Contributing

We welcome contributions from the Farcaster and Base communities:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style and conventions
- Include tests for new functionality
- Update documentation for API changes
- Ensure all tests pass before submitting

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Empowering the creator economy through seamless crypto-to-fiat infrastructure**

*Built on Base Network using OnchainKit • Designed for Farcaster creators and builders*
