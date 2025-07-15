# Deployment Guide - Kenya USDC Off-Ramp

This guide will help you deploy your Kenya USDC Off-Ramp Mini App to production.

## Prerequisites

Before deploying, ensure you have:

1. **Regulatory Compliance**
   - [ ] Applied for VASP license (required by April 2025 in Kenya)
   - [ ] KYC/AML procedures in place
   - [ ] Legal review completed

2. **API Keys & Accounts**
   - [ ] Coinbase OnchainKit API key
   - [ ] MoonPay or Transak production API keys
   - [ ] M-Pesa Daraja API credentials (if using direct integration)
   - [ ] Compliance monitoring services (Chainalysis, Sumsub)

3. **Technical Setup**
   - [ ] Database setup (PostgreSQL recommended)
   - [ ] Redis for caching
   - [ ] Monitoring and alerting
   - [ ] Secure environment variables

## Step-by-Step Deployment

### 1. Environment Configuration

Create a `.env.production` file with your production values:

```bash
# Base Configuration
NEXT_PUBLIC_ONCHAINKIT_API_KEY=pk_prod_your_production_key
NEXT_PUBLIC_URL=https://your-domain.com
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=Kenya USDC Off-Ramp

# Off-ramp Provider (Production)
MOONPAY_API_KEY=pk_live_your_moonpay_key
MOONPAY_SECRET_KEY=sk_live_your_moonpay_secret

# M-Pesa Production (Safaricom)
MPESA_CONSUMER_KEY=your_production_consumer_key
MPESA_CONSUMER_SECRET=your_production_consumer_secret
MPESA_PASSKEY=your_production_passkey
MPESA_SHORTCODE=your_production_shortcode

# Compliance
SUMSUB_APP_TOKEN=your_sumsub_production_token
CHAINALYSIS_API_KEY=your_chainalysis_production_key

# Database
DATABASE_URL=postgresql://user:pass@host:5432/kenya_offramp_prod
REDIS_URL=redis://your-redis-host:6379

# Security
NODE_ENV=production
```

### 2. Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to Vercel
vercel

# Set production environment variables
vercel env add NEXT_PUBLIC_ONCHAINKIT_API_KEY production
vercel env add MOONPAY_API_KEY production
# ... add all other environment variables

# Deploy to production
vercel --prod
```

### 3. Domain Setup

1. **Custom Domain**
   ```bash
   vercel domains add your-domain.com
   ```

2. **SSL Certificate**
   - Vercel automatically provides SSL
   - Ensure HTTPS is enforced

3. **DNS Configuration**
   - Point your domain to Vercel's servers
   - Add necessary DNS records

### 4. Database Setup

#### PostgreSQL Schema

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    email VARCHAR(255),
    phone_number VARCHAR(20),
    kyc_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    wallet_address VARCHAR(42) NOT NULL,
    usdc_amount DECIMAL(18,6) NOT NULL,
    ksh_amount DECIMAL(18,2) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    provider VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    usdc_tx_hash VARCHAR(66),
    mpesa_reference VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Compliance logs
CREATE TABLE compliance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_transactions_wallet ON transactions(wallet_address);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created ON transactions(created_at);
```

### 5. Monitoring Setup

#### Application Monitoring

```javascript
// lib/monitoring.ts
import { createLogger } from 'winston'

export const logger = createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
})

// In production, add cloud monitoring
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.Console())
}
```

#### Error Tracking

```bash
# Add Sentry for error tracking
npm install @sentry/nextjs
```

### 6. Security Checklist

- [ ] **HTTPS Enforced**: All traffic uses SSL
- [ ] **API Keys Secured**: No keys in client-side code
- [ ] **Rate Limiting**: Implement rate limits on APIs
- [ ] **Input Validation**: Validate all user inputs
- [ ] **CORS Configuration**: Proper CORS headers
- [ ] **Webhook Verification**: Verify all webhook signatures
- [ ] **Database Security**: Encrypted connections and proper permissions

### 7. Compliance Setup

#### KYC Integration (Sumsub)

```typescript
// lib/kyc.ts
import { SumsubWebSdk } from '@sumsub/websdk'

export function initializeKYC(userId: string) {
  return SumsubWebSdk.init(
    process.env.SUMSUB_APP_TOKEN!,
    {
      userId,
      onMessage: (type, payload) => {
        console.log('KYC message:', type, payload)
      },
      onError: (error) => {
        console.error('KYC error:', error)
      }
    }
  )
}
```

#### Transaction Monitoring

```typescript
// lib/compliance.ts
import { Chainalysis } from '@chainalysis/web3'

const chainalysis = new Chainalysis({
  apiKey: process.env.CHAINALYSIS_API_KEY!
})

export async function screenTransaction(address: string, amount: number) {
  try {
    const result = await chainalysis.screenAddress(address)
    
    if (result.risk === 'high') {
      // Flag for manual review
      await flagForReview(address, 'High risk address detected')
      return false
    }
    
    return true
  } catch (error) {
    console.error('Compliance screening failed:', error)
    return false
  }
}
```

### 8. Testing in Production

#### Smoke Tests

```bash
# Test API endpoints
curl -X POST https://your-domain.com/api/offramp \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x...",
    "usdcAmount": 10,
    "kshAmount": 1292,
    "phoneNumber": "+254712345678"
  }'
```

#### User Journey Testing

1. **Wallet Connection**: Verify MiniKit integration
2. **Balance Display**: Check USDC balance retrieval
3. **Conversion Flow**: Test complete off-ramp process
4. **Error Handling**: Verify proper error messages
5. **Compliance**: Test KYC and transaction limits

### 9. Go-Live Checklist

- [ ] **Legal Approval**: All regulatory requirements met
- [ ] **Security Audit**: Third-party security review completed
- [ ] **Load Testing**: System tested under expected load
- [ ] **Monitoring**: All monitoring and alerting active
- [ ] **Documentation**: User guides and support docs ready
- [ ] **Customer Support**: Support channels established
- [ ] **Backup Plan**: Rollback procedures documented
- [ ] **Team Training**: Support team trained on the system

### 10. Post-Launch Monitoring

#### Key Metrics to Track

- **Transaction Volume**: Daily/monthly USDC conversion volume
- **Success Rate**: Percentage of successful transactions
- **Average Processing Time**: End-to-end transaction time
- **Error Rates**: API and transaction error frequencies
- **User Growth**: New user registrations and retention
- **Compliance Alerts**: Flagged transactions for review

#### Alerting Setup

```javascript
// Configure alerts for:
- Failed transactions > 5% in 1 hour
- API response time > 5 seconds
- High-risk transactions detected
- System errors or downtime
- Unusual transaction patterns
```

### 11. Maintenance and Updates

#### Regular Tasks

- **Security Updates**: Keep dependencies updated
- **Compliance Reviews**: Monthly compliance audits
- **Performance Optimization**: Monitor and optimize slow queries
- **User Feedback**: Regular user experience reviews
- **API Updates**: Stay current with provider API changes

#### Scaling Considerations

- **Database Optimization**: Index optimization and query tuning
- **Caching Strategy**: Redis for frequently accessed data
- **API Rate Limits**: Monitor and adjust rate limits
- **Infrastructure Scaling**: Auto-scaling for high traffic
- **Geographic Expansion**: Support for other East African countries

## Support and Troubleshooting

### Common Issues

1. **High Transaction Fees**
   - Review provider fee structures
   - Implement fee optimization logic

2. **Failed M-Pesa Payments**
   - Check phone number validation
   - Verify M-Pesa account status
   - Review provider webhook handling

3. **Slow Transaction Processing**
   - Monitor Base network congestion
   - Optimize database queries
   - Review provider processing times

### Emergency Procedures

- **System Downtime**: Activate maintenance mode
- **Security Breach**: Isolate affected systems, notify users
- **Compliance Issues**: Suspend operations, contact regulators
- **Provider Outage**: Switch to backup provider if available

---

**Important**: This is a financial application handling real money. Always prioritize security, compliance, and user protection. Consult with legal and financial experts before going live. 