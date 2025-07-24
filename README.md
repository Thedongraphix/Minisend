# Mini Send - Farcaster USDC to Mobile Money

A Farcaster mini app that enables seamless conversion of USDC to mobile money using PayCrest's Sender API.

## Features

- 🔗 Farcaster MiniKit integration with hybrid wallet strategy
- 💰 USDC to mobile money conversion via PayCrest
- 📱 Mobile-optimized UI for Farcaster frames
- 🇰🇪 Kenyan carrier detection (Safaricom, Airtel, Telkom, Equitel)
- ⚡ Real-time transaction tracking with Base Pay
- 📊 Comprehensive analytics with Supabase integration
- 🔐 Secure webhook processing with signature verification
- 🏗️ Built on Base network for fast, low-cost transactions

## Tech Stack

- Next.js 15 with TypeScript
- Coinbase OnchainKit & MiniKit
- PayCrest Sender API
- Supabase Database
- Base Network (USDC)
- Wagmi & Viem

## Getting Started

1. Clone the repository
```bash
git clone https://github.com/your-username/mini-test.git
cd mini-test
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
# Edit .env.local with your actual API keys
```

4. Set up Supabase database
```bash
# Run the schema.sql file in your Supabase project
```

5. Run development server
```bash
npm run dev
```

## Environment Variables

Required environment variables (see `.env.example`):

- `PAYCREST_API_KEY` - Your PayCrest API key
- `PAYCREST_CLIENT_SECRET` - PayCrest client secret
- `SUPABASE_*` - Supabase database credentials
- `NEXT_PUBLIC_CDP_API_KEY` - Coinbase Developer Platform API key

## Production Deployment

This app is optimized for deployment on Vercel with automatic Supabase integration and PayCrest webhook handling.

