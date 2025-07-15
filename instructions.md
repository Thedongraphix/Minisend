# Kenya USDC Off-Ramp Mini App - Development Guide

> Build a Farcaster mini app for USDC to Kenyan Shilling conversion using MiniKit

## Quick Start

```bash
npx create-onchain --mini
cd your-project-name
npm install
```

## Project Overview

**Goal**: Create a mini app that allows Kenyan users to convert USDC to KSH via M-Pesa
**Target Market**: Kenya (28th highest crypto adoption globally, $4.95B remittance market)
**Key Features**: USDC wallet integration, M-Pesa payouts, compliance-ready architecture

## Core Architecture

### Tech Stack
- **Frontend**: Next.js 14 + MiniKit + OnchainKit
- **Blockchain**: Base network (USDC on Base)
- **Off-ramp Provider**: MoonPay or Transak (both support Kenya + KSH)
- **Mobile Money**: M-Pesa API (Daraja 3.0)
- **Compliance**: Built-in KYC/AML workflows

### Environment Variables
```bash
# Base Configuration
NEXT_PUBLIC_CDP_CLIENT_API_KEY=
NEXT_PUBLIC_ONCHAINKIT_API_KEY=
NEXT_PUBLIC_URL=

# Off-ramp Provider (choose one)
MOONPAY_API_KEY=
MOONPAY_SECRET_KEY=
# OR
TRANSAK_API_KEY=
TRANSAK_SECRET_KEY=

# M-Pesa Integration
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_PASSKEY=
MPESA_SHORTCODE=

# Compliance
SUMSUB_APP_TOKEN=  # For KYC
CHAINALYSIS_API_KEY=  # For transaction monitoring
```

## Core Components to Build

### 1. USDC Balance Display
```tsx
// components/USDCBalance.tsx
import { useAccount, useBalance } from 'wagmi'
import { base } from 'wagmi/chains'

const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // USDC on Base

export function USDCBalance() {
  const { address } = useAccount()
  const { data: balance } = useBalance({
    address,
    token: USDC_CONTRACT,
    chainId: base.id,
  })

  return (
    <div className="bg-blue-50 p-4 rounded-lg">
      <h3 className="text-lg font-semibold">Available USDC</h3>
      <p className="text-2xl font-bold text-blue-600">
        ${balance?.formatted || '0.00'}
      </p>
    </div>
  )
}
```

### 2. KSH Conversion Calculator
```tsx
// components/ConversionCalculator.tsx
import { useState, useEffect } from 'react'

export function ConversionCalculator({ usdcAmount, onKshChange }) {
  const [exchangeRate, setExchangeRate] = useState(129.2) // Current USDC to KSH rate
  const [fees, setFees] = useState(0)
  const kshAmount = (usdcAmount * exchangeRate) - fees

  useEffect(() => {
    // Calculate fees based on amount (2-4% for M-Pesa)
    const feePercentage = usdcAmount > 100 ? 0.02 : 0.04
    setFees(usdcAmount * exchangeRate * feePercentage)
    onKshChange(kshAmount)
  }, [usdcAmount, exchangeRate])

  return (
    <div className="bg-green-50 p-4 rounded-lg">
      <div className="flex justify-between">
        <span>You'll receive:</span>
        <span className="font-bold">KSH {kshAmount.toFixed(2)}</span>
      </div>
      <div className="text-sm text-gray-600 mt-2">
        <div>Rate: 1 USDC = {exchangeRate} KSH</div>
        <div>Fees: KSH {fees.toFixed(2)}</div>
      </div>
    </div>
  )
}
```

### 3. M-Pesa Integration Component
```tsx
// components/MPesaForm.tsx
import { useState } from 'react'

export function MPesaForm({ kshAmount, onSubmit }) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isValidating, setIsValidating] = useState(false)

  const validateKenyanPhone = (phone) => {
    // Kenyan phone format: +254XXXXXXXXX or 07XXXXXXXX or 01XXXXXXXX
    const regex = /^(\+254|0)[17]\d{8}$/
    return regex.test(phone)
  }

  const formatPhoneNumber = (phone) => {
    if (phone.startsWith('0')) {
      return '+254' + phone.substring(1)
    }
    return phone
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateKenyanPhone(phoneNumber)) {
      alert('Please enter a valid Kenyan phone number')
      return
    }

    setIsValidating(true)
    try {
      await onSubmit({
        phoneNumber: formatPhoneNumber(phoneNumber),
        amount: kshAmount
      })
    } catch (error) {
      console.error('M-Pesa submission error:', error)
    }
    setIsValidating(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">M-Pesa Phone Number</label>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="0712345678 or +254712345678"
          className="w-full p-3 border rounded-lg"
          required
        />
      </div>
      <button
        type="submit"
        disabled={isValidating || !validateKenyanPhone(phoneNumber)}
        className="w-full bg-green-600 text-white p-3 rounded-lg disabled:opacity-50"
      >
        {isValidating ? 'Processing...' : `Send KSH ${kshAmount.toFixed(2)} to M-Pesa`}
      </button>
    </form>
  )
}
```

### 4. Main Off-Ramp Flow
```tsx
// components/OffRampFlow.tsx
import { useState } from 'react'
import { USDCBalance } from './USDCBalance'
import { ConversionCalculator } from './ConversionCalculator'
import { MPesaForm } from './MPesaForm'
import { useAccount } from 'wagmi'

export function OffRampFlow() {
  const { address, isConnected } = useAccount()
  const [usdcAmount, setUsdcAmount] = useState(0)
  const [kshAmount, setKshAmount] = useState(0)
  const [step, setStep] = useState(1) // 1: Amount, 2: M-Pesa, 3: Confirm, 4: Processing

  const handleMPesaSubmit = async (mpesaData) => {
    setStep(4)
    try {
      // Submit to your backend API
      const response = await fetch('/api/offramp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          usdcAmount,
          kshAmount,
          phoneNumber: mpesaData.phoneNumber,
        })
      })
      
      if (response.ok) {
        // Handle success - maybe show transaction hash
        setStep(5) // Success step
      } else {
        throw new Error('Transaction failed')
      }
    } catch (error) {
      console.error('Off-ramp error:', error)
      setStep(2) // Back to M-Pesa form
    }
  }

  if (!isConnected) {
    return (
      <div className="text-center p-8">
        <h2 className="text-xl mb-4">Connect Your Wallet</h2>
        <p>Please connect your wallet to continue with USDC off-ramp</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold text-center">USDC to M-Pesa</h1>
      
      <USDCBalance />
      
      {step >= 1 && (
        <div>
          <label className="block text-sm font-medium mb-2">Amount to Convert (USDC)</label>
          <input
            type="number"
            value={usdcAmount}
            onChange={(e) => setUsdcAmount(parseFloat(e.target.value) || 0)}
            placeholder="Enter USDC amount"
            className="w-full p-3 border rounded-lg"
            min="1"
            max="1000" // Compliance limit
          />
          {usdcAmount > 0 && (
            <button
              onClick={() => setStep(2)}
              className="w-full mt-4 bg-blue-600 text-white p-3 rounded-lg"
            >
              Continue
            </button>
          )}
        </div>
      )}
      
      {step >= 2 && (
        <ConversionCalculator 
          usdcAmount={usdcAmount} 
          onKshChange={setKshAmount}
        />
      )}
      
      {step >= 2 && (
        <MPesaForm 
          kshAmount={kshAmount}
          onSubmit={handleMPesaSubmit}
        />
      )}
      
      {step === 4 && (
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Processing your transaction...</p>
        </div>
      )}
      
      {step === 5 && (
        <div className="text-center p-8 bg-green-50 rounded-lg">
          <h3 className="text-xl font-bold text-green-800 mb-2">Success!</h3>
          <p>KSH {kshAmount.toFixed(2)} has been sent to your M-Pesa account</p>
        </div>
      )}
    </div>
  )
}
```

## Backend API Routes

### Off-ramp Processing API
```typescript
// pages/api/offramp.ts
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { walletAddress, usdcAmount, kshAmount, phoneNumber } = req.body

  try {
    // 1. Validate USDC balance
    const balance = await checkUSDCBalance(walletAddress)
    if (balance < usdcAmount) {
      return res.status(400).json({ error: 'Insufficient USDC balance' })
    }

    // 2. Initiate USDC transfer to escrow/exchange
    const usdcTxHash = await transferUSDCToEscrow(walletAddress, usdcAmount)

    // 3. Process M-Pesa payment via provider (MoonPay/Transak)
    const mpesaResult = await processMPesaPayment({
      phoneNumber,
      amount: kshAmount,
      reference: usdcTxHash
    })

    // 4. Log transaction for compliance
    await logTransaction({
      walletAddress,
      usdcAmount,
      kshAmount,
      phoneNumber,
      usdcTxHash,
      mpesaReference: mpesaResult.reference,
      timestamp: new Date()
    })

    res.status(200).json({
      success: true,
      usdcTxHash,
      mpesaReference: mpesaResult.reference
    })

  } catch (error) {
    console.error('Off-ramp processing error:', error)
    res.status(500).json({ error: 'Transaction failed' })
  }
}

async function checkUSDCBalance(address: string) {
  // Implementation using viem or web3
}

async function transferUSDCToEscrow(address: string, amount: number) {
  // Implementation for USDC transfer
}

async function processMPesaPayment(data: any) {
  // Integration with MoonPay/Transak or direct M-Pesa API
}

async function logTransaction(data: any) {
  // Store in database for compliance
}
```

## Integration Options

### Option 1: MoonPay Integration (Recommended)
```typescript
// lib/moonpay.ts
import crypto from 'crypto'

export class MoonPayIntegration {
  private apiKey: string
  private secretKey: string
  private baseUrl = 'https://api.moonpay.com'

  constructor(apiKey: string, secretKey: string) {
    this.apiKey = apiKey
    this.secretKey = secretKey
  }

  async initiateSellTransaction(params: {
    walletAddress: string
    cryptoCurrency: 'usdc'
    baseCurrency: 'kes'
    quoteCurrencyAmount: number
    externalCustomerId: string
    redirectURL: string
  }) {
    const query = new URLSearchParams({
      apiKey: this.apiKey,
      currencyCode: params.cryptoCurrency,
      baseCurrencyCode: params.baseCurrency,
      baseCurrencyAmount: params.quoteCurrencyAmount.toString(),
      externalCustomerId: params.externalCustomerId,
      redirectURL: params.redirectURL,
    })

    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(query.toString())
      .digest('base64')

    return `${this.baseUrl}/v4/sell_transaction?${query}&signature=${encodeURIComponent(signature)}`
  }
}
```

### Option 2: Transak Integration
```typescript
// lib/transak.ts
export class TransakIntegration {
  private apiKey: string
  private environment: 'STAGING' | 'PRODUCTION'

  constructor(apiKey: string, environment = 'STAGING') {
    this.apiKey = apiKey
    this.environment = environment
  }

  generateURL(params: {
    walletAddress: string
    cryptoCurrencyCode: 'USDC'
    fiatCurrency: 'KES'
    fiatAmount: number
    email: string
    phoneNumber: string
  }) {
    const baseUrl = this.environment === 'STAGING' 
      ? 'https://staging-global.transak.com' 
      : 'https://global.transak.com'

    const query = new URLSearchParams({
      apiKey: this.apiKey,
      hostURL: window.location.origin,
      walletAddress: params.walletAddress,
      cryptoCurrencyCode: params.cryptoCurrencyCode,
      fiatCurrency: params.fiatCurrency,
      fiatAmount: params.fiatAmount.toString(),
      email: params.email,
      mobileNumber: params.phoneNumber,
      redirectURL: `${window.location.origin}/success`,
      productsAvailed: 'SELL',
      themeColor: '000000'
    })

    return `${baseUrl}?${query}`
  }
}
```

## Deployment Checklist

### Pre-deployment
- [ ] Set up Vercel project with environment variables
- [ ] Configure Base network RPC endpoints
- [ ] Set up MoonPay/Transak sandbox accounts
- [ ] Implement basic KYC flow (required for Kenya)
- [ ] Add transaction monitoring for AML compliance
- [ ] Test M-Pesa integration in sandbox

### Production Readiness
- [ ] Complete VASP license application (required by April 2025)
- [ ] Implement comprehensive AML/CFT systems
- [ ] Set up production monitoring and alerts
- [ ] Configure rate limiting and DDoS protection
- [ ] Implement proper error handling and user feedback
- [ ] Add customer support integration

### Compliance Requirements
- [ ] KYC verification (ID, proof of address, phone verification)
- [ ] Transaction limits (start with $100-1000 USDC per transaction)
- [ ] AML screening integration
- [ ] Suspicious activity reporting
- [ ] Record keeping (5-year retention)

## Kenyan Market Considerations

### User Experience
- **Mobile-first design** (86.2% Android users in Kenya)
- **Optimize for 2G/3G networks** (only 15% 4G penetration)
- **Support for Kiswahili language**
- **Familiar M-Pesa-style UI patterns**
- **Progressive web app features** for app-like experience

### Technical Optimizations
- **Aggressive data compression** (mobile data costs $3.31/GB)
- **Offline transaction preparation**
- **Background sync when network improves**
- **Local storage for transaction history**

### Compliance Timeline
- **April 2025**: VASP framework goes live in Kenya
- **Before April**: Apply for VASP license, implement AML systems
- **After April**: Full compliance required for legal operation

## Getting Started Commands

```bash
# 1. Set up the project
npx create-onchain --mini
cd kenya-usdc-offramp

# 2. Install additional dependencies
npm install viem wagmi @moonpay/web-sdk @transak/transak-sdk

# 3. Set up environment variables
cp .env.example .env.local
# Fill in your API keys

# 4. Start development
npm run dev

# 5. Deploy to Vercel
vercel
```

## Resources

- [MiniKit Documentation](https://docs.base.org/wallet-app/build-with-minikit)
- [MoonPay Kenya Documentation](https://www.moonpay.com/sell/usdc)
- [M-Pesa Daraja API](https://developer.safaricom.co.ke/)
- [Kenya VASP Bill 2024](https://parliament.go.ke/the-national-assembly)
- [OnchainKit Documentation](https://onchainkit.xyz/)

Start with the basic off-ramp flow, then progressively add compliance features as you approach the April 2025 regulatory deadline.