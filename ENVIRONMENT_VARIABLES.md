# Environment Variables Guide

Copy this file to `.env.local` in your project root and fill in your actual values.

```bash
# Base Configuration
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_onchainkit_api_key_here
NEXT_PUBLIC_URL=http://localhost:3000

# Network Configuration  
NEXT_PUBLIC_USE_TESTNET=true

# Farcaster Account Association (required for frame verification)
FARCASTER_HEADER=your_farcaster_header_here
FARCASTER_PAYLOAD=your_farcaster_payload_here
FARCASTER_SIGNATURE=your_farcaster_signature_here

# Mini App Metadata - Basic Info
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=Kenya USDC Off-Ramp
NEXT_PUBLIC_APP_SUBTITLE=Convert USDC to M-Pesa easily
NEXT_PUBLIC_APP_DESCRIPTION=Seamlessly convert USDC on Base to Kenyan Shillings via M-Pesa. Mobile-first design for Kenya's growing crypto market.

# Mini App Metadata - Visual Assets (1024x1024 PNG for icon, portrait 1284x2778 for screenshots)
NEXT_PUBLIC_APP_ICON=https://your-domain.com/icon.png
NEXT_PUBLIC_APP_SPLASH_IMAGE=https://your-domain.com/splash.png
NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR=#0052FF
NEXT_PUBLIC_APP_HERO_IMAGE=https://your-domain.com/hero.png

# Mini App Metadata - Store Listing
NEXT_PUBLIC_APP_PRIMARY_CATEGORY=finance
NEXT_PUBLIC_APP_TAGLINE=USDC to M-Pesa in seconds
NEXT_PUBLIC_APP_SCREENSHOT_1=https://your-domain.com/screenshot1.png
NEXT_PUBLIC_APP_SCREENSHOT_2=https://your-domain.com/screenshot2.png
NEXT_PUBLIC_APP_SCREENSHOT_3=https://your-domain.com/screenshot3.png

# Mini App Metadata - Social Sharing (1200x630 for OG images)
NEXT_PUBLIC_APP_OG_TITLE=Kenya USDC Off-Ramp – Fast & Secure
NEXT_PUBLIC_APP_OG_DESCRIPTION=Convert USDC to Kenyan Shillings via M-Pesa. Built for Kenya's crypto users.
NEXT_PUBLIC_APP_OG_IMAGE=https://your-domain.com/og-image.png

# M-Pesa Integration (Safaricom Daraja API)
MPESA_CONSUMER_KEY=your_mpesa_consumer_key_here
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret_here
MPESA_PASSKEY=your_mpesa_passkey_here
MPESA_SHORTCODE=your_mpesa_business_shortcode_here

# Redis Configuration (for notifications and caching)
REDIS_URL=your_redis_url_here
REDIS_TOKEN=your_redis_token_here

# Notification Service (Optional - Neynar)
NEYNAR_API_KEY=your_neynar_api_key_here

# Analytics & Monitoring (Optional)
ANALYTICS_API_KEY=your_analytics_api_key_here

# Production Only - Compliance (Required for Kenya VASP)
SUMSUB_APP_TOKEN=your_sumsub_token_here
CHAINALYSIS_API_KEY=your_chainalysis_api_key_here
```

## Required for Production

### Image Asset Guidelines
- **Icon**: 1024x1024 px PNG, no alpha channel, bold recognizable logo
- **Screenshots**: Portrait 1284x2778 px, focus on core value/magic moment  
- **Hero Image**: 1200x630 px (1.91:1 ratio), clear brand display
- **OG Image**: Same as hero image (1200x630 px)

### Category Options
Choose one primary category:
- `games`, `social`, `finance`, `utility`, `productivity`, `health-fitness`
- `news-media`, `music`, `shopping`, `education`, `developer-tools`, `entertainment`, `art-creativity`

### Tag Guidelines
- Use 3-5 high-volume search terms
- No spaces, no repeats, no brand names
- Use singular form (e.g., "payment" not "payments")
- Example: `["usdc", "mpesa", "kenya", "crypto", "finance"]`

## Getting Your API Keys

1. **OnchainKit API Key**: [Get from Coinbase Developer Platform](https://portal.cdp.coinbase.com/)
2. **M-Pesa Credentials**: [Register at Safaricom Daraja](https://developer.safaricom.co.ke/)
3. **Redis**: [Upstash Redis](https://upstash.com/) for notifications
4. **Neynar** (Optional): [Neynar API](https://neynar.com/) for enhanced notifications

## Farcaster Account Association

To generate the required Farcaster account association:

1. Visit [Farcaster account association tool](https://warpcast.com/~/developers)
2. Connect your wallet that will sign for the frame
3. Generate header, payload, and signature
4. Add these to your environment variables 