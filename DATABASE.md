# Database Integration Documentation

## Overview
This project includes complete database integration with Supabase for tracking Paycrest payments, analytics, and user interactions.

## Database Schema
All data is stored in EAT (East Africa Time) timezone and ordered from latest to oldest by default.

### Core Tables
- **users** - User accounts linked to wallet addresses
- **orders** - Complete Paycrest order details and tracking
- **settlements** - Successful payment settlements
- **webhook_events** - All webhook events from Paycrest
- **analytics_events** - User interactions and system events
- **polling_attempts** - Order status check history
- **carrier_detections** - Phone number carrier detection results
- **paycrest_orders** - Raw Paycrest API request/response data
- **status_history** - Complete audit trail of status changes
- **fees** - Detailed fee breakdown for each transaction

### Analytics Views
- **order_analytics** - Daily order summaries with success rates
- **settlement_analytics** - Settlement tracking and timing
- **polling_analytics** - Status check frequency and patterns
- **fee_analytics** - Fee breakdown by type and currency
- **status_analytics** - Status transition tracking

## Setup Instructions

### 1. Database Setup
Run the database migration:
```bash
npm run setup-supabase
```

Or manually execute `database-fresh-start.sql` in your Supabase SQL Editor for a clean setup.

### 2. Environment Variables
Ensure these are set in your `.env` file:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key  
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### 3. Testing
Quick database test:
```bash
npm run test-db-quick
```

Full integration test:
```bash
npm run test-db-full
```

Payment simulation (no API calls):
```bash
node test-payment-simulation.js
```

## How It Works

### Order Creation Flow
1. User creates order via `/api/paycrest/orders/simple`
2. System calls Paycrest API to create order
3. **Database automatically records:**
   - Order details with all Paycrest fields
   - Carrier detection results
   - Raw API request/response data
   - Analytics event for order creation

### Status Monitoring Flow  
1. System checks order status via `/api/paycrest/status/[orderId]`
2. **Database automatically updates:**
   - Order status if changed
   - Status history with timestamp
   - Polling attempt logs
   - Transaction hash when settled

### Data Flow
```
Paycrest API ↔ Your API ↔ Database
                    ↓
            Analytics & Reports
```

## Security Features
- Row Level Security (RLS) enabled on all tables
- SECURITY INVOKER views (fixes Supabase Security Advisor issues)
- Service role access for backend operations
- Audit trail for all data changes

## Analytics & Reporting
Access analytics through the views:
```sql
-- Recent orders
SELECT * FROM order_analytics ORDER BY order_date DESC;

-- Success rates by currency
SELECT local_currency, success_rate_percent 
FROM order_analytics 
WHERE order_date >= CURRENT_DATE - INTERVAL '30 days';

-- Settlement performance
SELECT * FROM settlement_analytics ORDER BY settlement_date DESC;
```

## Development
The database integration is automatic. When you:
- Create orders → Data is logged
- Check status → Updates are tracked  
- Process payments → Everything is recorded

No manual database operations required in your application code.