# Kenya USDC Off-Ramp Mini App

A Farcaster mini app for converting USDC to Kenyan Shillings via M-Pesa, built with MiniKit and OnchainKit.

## 🌍 Overview

This mini app enables Kenyan users to seamlessly convert USDC on Base network to KSH in their M-Pesa wallets. It's designed for Kenya's growing crypto market ($4.95B remittance market, 28th highest crypto adoption globally).

## ✨ Features

- **USDC Balance Display**: Real-time USDC balance on Base network  
- **Live Exchange Rates**: Current USDC to KSH conversion rates
- **M-Pesa STK Push**: Direct M-Pesa integration with STK Push payments
- **Network Support**: Base Sepolia testnet and Base mainnet support
- **Compliance Ready**: Built-in transaction limits and logging
- **Mobile-First Design**: Optimized for Kenyan mobile users
- **Wallet Integration**: MetaMask, Coinbase Wallet, and other popular wallets

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Coinbase OnchainKit API key  
- M-Pesa Developer credentials (Safaricom Daraja API)
- Base network RPC access (for USDC transactions)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd kenya-usdc-offramp

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your API keys
nano .env.local

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the app.

## 🔧 Environment Setup

### Required Environment Variables

```bash
# Base Configuration
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_onchainkit_api_key
NEXT_PUBLIC_URL=https://your-domain.com

# Off-ramp Provider (choose one)
MOONPAY_API_KEY=your_moonpay_api_key
MOONPAY_SECRET_KEY=your_moonpay_secret_key
# OR
TRANSAK_API_KEY=your_transak_api_key
TRANSAK_SECRET_KEY=your_transak_secret_key
```

### Getting API Keys

1. **OnchainKit**: [Get API key](https://portal.cdp.coinbase.com/)
2. **MoonPay**: [Apply for partnership](https://www.moonpay.com/business)
3. **Transak**: [Get API access](https://transak.com/business)

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14, React, TypeScript
- **Blockchain**: Base network (USDC on Base)
- **Wallet**: MiniKit wallet integration
- **Styling**: Tailwind CSS
- **Off-ramp**: MoonPay/Transak APIs

### Key Components

```
components/
├── USDCBalance.tsx      # Display USDC balance
├── ConversionCalculator.tsx  # Exchange rate calculator
├── MPesaForm.tsx        # M-Pesa payment form
└── OffRampFlow.tsx      # Main off-ramp orchestrator

lib/
├── moonpay.ts          # MoonPay integration
└── transak.ts          # Transak integration

app/api/
└── offramp/
    └── route.ts        # Off-ramp processing API
```

## 💳 How It Works

1. **Connect Wallet**: User connects wallet via MiniKit
2. **Check Balance**: Display available USDC on Base
3. **Enter Amount**: User inputs USDC amount to convert
4. **Calculate Conversion**: Real-time KSH amount with fees
5. **M-Pesa Details**: User enters Kenyan phone number
6. **Process Transaction**: 
   - Transfer USDC to off-ramp provider
   - Provider sends KSH to M-Pesa account
7. **Confirmation**: Transaction hash and M-Pesa reference

## 🌍 Kenyan Market Optimizations

### Mobile-First Design
- Optimized for 86.2% Android user base
- Works on 2G/3G networks (only 15% 4G penetration)
- Progressive Web App features

### User Experience
- Familiar M-Pesa-style UI patterns
- Support for common Kenyan phone formats
- Clear fee breakdown (important for price-conscious users)

### Compliance Features
- Transaction limits ($1-$1,000 USDC)
- Phone number validation for Kenya
- Transaction logging for audit trails
- Ready for VASP framework (April 2025)

## 🚀 Deployment

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel

# Add environment variables in Vercel dashboard
# Promote to production
vercel --prod
```

### Environment Variables for Production

Make sure to set these in your Vercel dashboard:

- `NEXT_PUBLIC_ONCHAINKIT_API_KEY`
- `NEXT_PUBLIC_URL` (your production domain)
- `MOONPAY_API_KEY` / `TRANSAK_API_KEY`
- `MOONPAY_SECRET_KEY` / `TRANSAK_SECRET_KEY`
- `NODE_ENV=production`

## 📱 Testing

### Development Testing

```bash
# Test with sandbox APIs
npm run dev

# Use test Kenyan phone numbers:
# +254712345678 (Safaricom)
# +254734567890 (Safaricom)
```

### Production Checklist

- [ ] Real API keys configured
- [ ] Domain whitelisted with providers
- [ ] KYC flow tested
- [ ] M-Pesa integration verified
- [ ] Transaction limits tested
- [ ] Error handling verified

## 🔐 Compliance & Security

### Current Implementation
- Basic transaction limits
- Phone number validation
- Transaction logging
- Secure API key handling

### Production Requirements (by April 2025)
- [ ] VASP license application
- [ ] Enhanced KYC/AML systems
- [ ] Sumsub integration for identity verification
- [ ] Chainalysis for transaction monitoring
- [ ] 5-year record retention
- [ ] Suspicious activity reporting

## 🛣️ Roadmap

### Phase 1 (MVP) - ✅ Complete
- Basic USDC to M-Pesa conversion
- MiniKit wallet integration
- Real-time exchange rates
- Transaction processing

### Phase 2 (Compliance)
- [ ] KYC integration
- [ ] Enhanced AML monitoring
- [ ] VASP license application
- [ ] Audit trail improvements

### Phase 3 (Scale)
- [ ] Multi-currency support
- [ ] Bank transfer options
- [ ] Transaction history
- [ ] Customer support integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if needed
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

- **Documentation**: [Base MiniKit Docs](https://docs.base.org/wallet-app/build-with-minikit)
- **Issues**: Create an issue in this repository
- **Community**: Join the Base Discord

## ⚠️ Disclaimer

This is a demo application. Before launching in production:
1. Obtain proper licenses and regulatory approval
2. Implement comprehensive KYC/AML systems
3. Ensure compliance with Kenyan financial regulations
4. Conduct security audits
5. Set up proper monitoring and alerting

---

Built with ❤️ for the Kenyan crypto community
