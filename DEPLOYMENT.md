# Deployment Guide

## Prerequisites

- PayCrest API account with API key
- Supabase project set up
- Coinbase Developer Platform API key
- Vercel account (recommended)

## Environment Setup

1. Copy environment variables:
```bash
cp .env.example .env.local
```

2. Configure required variables:
```env
# PayCrest Configuration
PAYCREST_API_KEY=your_paycrest_api_key
PAYCREST_CLIENT_SECRET=your_paycrest_client_secret
PAYCREST_BASE_URL=https://api.paycrest.io
RETURN_ADDRESS=your_return_wallet_address

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Coinbase Configuration
NEXT_PUBLIC_CDP_API_KEY=your_coinbase_api_key
```

## Database Setup

1. Import schema to Supabase:
```bash
# Run supabase/schema.sql in your Supabase project
```

2. Enable RLS policies for security

## Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

## Production Checklist

- [ ] PayCrest API key configured and tested
- [ ] Supabase database schema imported
- [ ] Environment variables set in production
- [ ] HTTPS webhook URL configured
- [ ] Domain configured for Farcaster frames
- [ ] Error monitoring enabled

## Monitoring

- Check Vercel function logs for API errors
- Monitor Supabase for database issues
- Set up alerts for PayCrest webhook failures