# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical Development Guidelines

### Pre-Development Requirements
**ALWAYS check the `.claude` directory first before making any changes:**
- Read all instruction files in `.claude/` directory
- Follow project-specific guidelines and patterns
- Understand API integrations and architectural decisions
- Review security and coding standards

### Logging Restrictions
**NO console logs allowed on browser/client-side code:**
- Never use `console.log`, `console.error`, `console.warn` in client components
- Server-side API routes can use console logging for debugging
- Use proper error handling without exposing logs to browser
- All client-side debugging must be removed before committing

## Development Commands

### Core Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Database Operations
- `npm run setup-supabase` - Initialize database schema
- `npm run test-db-quick` - Quick database connectivity test
- `npm run test-db-full` - Comprehensive database integration test
- `npm run test-supabase` - Test Supabase connection
- `npm run health-check` - Check database health

## Architecture Overview

### Core Platform
Minisend is a USDC-to-mobile-money platform built on Base Network, enabling conversion to KES (Kenya/M-Pesa) and NGN (Nigeria/Bank). The app operates as both a web platform and Farcaster mini app.

### Component Structure (Recently Renamed for Clarity)
**Main Flow Components:**
- `ExchangeFlow.tsx` - Complete off-ramp flow (was `SimpleOffRampFlow`)
- `SpendFlow.tsx` - USDC spending workflow (was `SpendUSDCFlow`)
- `PaymentProcessor.tsx` - Core payment processing (was `SimpleUSDCPayment`)

**UI & Interaction:**
- `BaseComponents.tsx` - Shared UI components (was `DemoComponents`)
- `MethodSelector.tsx` - Payment method selection (was `PaymentMethodSelector`)
- `AdvancedSelector.tsx` - Enhanced payment selection (was `EnhancedPaymentSelector`)
- `LoadingSpinner.tsx` - Payment loading states (was `PaymentSpinner`)

**Wallet & Connection:**
- `BalanceView.tsx` - USDC balance display (was `DirectUSDCBalance`)
- `ConnectionHandler.tsx` - Wallet connection logic (was `MobileWalletHandler`)
- `ConnectWidget.tsx` - Wallet connection UI (was `WalletIsland`)
- `TransactionHandler.tsx` - Gasless transaction processing (was `GaslessTransaction`)

### Payment Processing Architecture

**PayCrest Integration:**
- API routes in `/app/api/paycrest/` handle all PayCrest communication
- Real-time payment monitoring with intelligent polling
- Comprehensive error handling and status tracking
- Support for both KES (M-Pesa) and NGN (Bank transfers)

**Key API Endpoints:**
- `/api/paycrest/orders/simple` - Create payment orders
- `/api/paycrest/status/[orderId]` - Monitor payment status
- `/api/paycrest/rates/[token]/[amount]/[currency]` - Get exchange rates
- `/api/paycrest/institutions/[currency]` - Get supported banks/carriers
- `/api/paycrest/webhook` - Handle payment status updates

### Database Integration

**Supabase Configuration:**
- Automatic order tracking with EAT timezone support
- Analytics views for monitoring performance
- Complete audit trail of payment status changes
- Carrier detection for Kenyan phone numbers

**Key Database Files:**
- `lib/supabase/config.ts` - Supabase client configuration
- Database schema includes orders, analytics, and status tracking

### OnchainKit & Wallet Integration

**Paymaster Configuration:**
- Gasless transactions via Coinbase CDP Paymaster
- Configuration in `lib/paymaster-config.ts`
- Automatic network selection (mainnet/testnet)
- USDC transfer sponsorship on Base Network

**MiniKit Integration:**
- Farcaster mini app support via `@coinbase/onchainkit/minikit`
- Automatic wallet detection and connection
- Frame-aware responsive design

### Security & Analytics

**Analytics Stack:**
- PostHog for user behavior tracking
- Custom wallet analytics in `lib/wallet-analytics.ts`
- Real-time payment monitoring and reporting

**Security Features:**
- Input validation and sanitization
- Secure API key management via environment variables
- No sensitive data in client-side code
- Proper error handling without data leakage

## Development Patterns

### Component Updates
When updating payment flows, remember the component relationships:
- `ExchangeFlow` orchestrates the complete off-ramp process
- `PaymentProcessor` handles the actual USDC transactions
- `ConnectionHandler` manages wallet state across flows

### Environment Configuration
Critical environment variables for functionality:
- `NEXT_PUBLIC_ONCHAINKIT_API_KEY` - OnchainKit API access
- `PAYCREST_API_KEY` - PayCrest payment processing
- `NEXT_PUBLIC_SUPABASE_*` - Database connectivity
- `NEXT_PUBLIC_PAYMASTER_*` - Gasless transaction configuration

### Payment Status Monitoring
Payment processing uses intelligent polling with exponential backoff. Status updates flow through:
1. Order creation via PayCrest API
2. Real-time status monitoring with timeout handling
3. Database logging for audit trail
4. User feedback with progress indicators

### Error Handling
Follow the established pattern of graceful degradation:
- Network failures: Retry with backoff
- API errors: User-friendly messages
- Wallet issues: Clear connection guidance
- Payment failures: Detailed troubleshooting

### Git Commit Standards
Always create professional, comprehensive commits without AI attribution:

**Commit Message Format:**
```
type(scope): brief description

Detailed explanation of changes, including:
- What was changed and why
- Any breaking changes or migration notes
- Performance implications
- Security considerations
```

**Commit Types:**
- `feat:` - New features or functionality
- `fix:` - Bug fixes and error corrections
- `refactor:` - Code restructuring without feature changes
- `perf:` - Performance improvements
- `security:` - Security enhancements
- `docs:` - Documentation updates
- `test:` - Test additions or modifications
- `chore:` - Maintenance tasks

**Examples:**
```
feat(payments): implement intelligent payment status monitoring

Added exponential backoff polling for PayCrest order status checks.
Improves user experience by reducing API calls while maintaining
real-time feedback. Includes comprehensive error handling for
network timeouts and rate limiting.

- Reduces API calls by 60% through smart polling intervals
- Adds graceful degradation for network issues
- Implements proper timeout handling for long-running orders
```

```
refactor(components): rename components for improved clarity

Updated component names to better reflect their functionality:
- SimpleOffRampFlow → ExchangeFlow
- SimpleUSDCPayment → PaymentProcessor
- DirectUSDCBalance → BalanceView

All imports and exports updated accordingly. No functional changes.
Build verified successfully with no breaking changes.
```

**Critical Requirements:**
- Never include AI attribution (no "🤖 Generated with Claude" etc.)
- Always explain the business impact of changes
- Include migration notes for breaking changes
- Reference related issues or pull requests when applicable
- Use present tense ("add feature" not "added feature")

## Key Libraries & Integrations

- **OnchainKit**: Wallet connection, transactions, identity
- **Wagmi**: Ethereum wallet management
- **PayCrest**: Off-ramp payment processing
- **Supabase**: Database and real-time updates
- **PostHog**: Analytics and user tracking
- **Next.js 15**: App framework with App Router

## Testing Strategy

Database testing is critical due to real-money transactions:
- Use `npm run test-db-quick` for connectivity verification
- Run `npm run test-db-full` before deploying payment changes
- Test wallet connections across different environments
- Verify paymaster configuration before production