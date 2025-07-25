# Minisend Database Setup Guide

## 🎯 Overview

This guide will help you set up the PostgreSQL database for the Minisend PayCrest integration with research-based polling support.

## 📋 Prerequisites

### 1. PostgreSQL Installation

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

**macOS (using Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

**Windows:**
Download and install from [PostgreSQL official website](https://www.postgresql.org/download/windows/)

### 2. Node.js Dependencies

```bash
npm install
```

## 🚀 Database Setup

### Step 1: Create Database

```bash
# Connect to PostgreSQL as superuser
sudo -u postgres psql

# Create database and user
CREATE DATABASE minisend;
CREATE USER minisend_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE minisend TO minisend_user;
\q
```

### Step 2: Configure Environment Variables

Copy the environment template:
```bash
cp env.example .env
```

Edit `.env` with your database credentials:
```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=minisend
DB_USER=minisend_user
DB_PASSWORD=your_secure_password
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000

# PayCrest API Configuration
PAYCREST_API_KEY=your_paycrest_api_key_here
PAYCREST_CLIENT_SECRET=your_paycrest_client_secret_here
PAYCREST_BASE_URL=https://api.paycrest.io/v1
PAYCREST_WEBHOOK_SECRET=your_webhook_secret_here

# Application Configuration
NEXT_PUBLIC_URL=http://localhost:3000
NODE_ENV=development
```

### Step 3: Run Database Setup

```bash
# Install dependencies
npm install

# Run database setup script
npm run setup-db
```

## 📊 Database Schema

### Core Tables

#### 1. `users` - Wallet Tracking
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_orders INTEGER DEFAULT 0,
    total_volume DECIMAL(20, 6) DEFAULT 0,
    preferred_currency VARCHAR(3) DEFAULT 'KES'
);
```

#### 2. `orders` - PayCrest Order Tracking
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paycrest_order_id VARCHAR(255) UNIQUE NOT NULL,
    paycrest_reference VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    wallet_address VARCHAR(42) NOT NULL,
    
    -- Order details
    amount DECIMAL(20, 6) NOT NULL,
    token VARCHAR(10) DEFAULT 'USDC',
    network VARCHAR(20) DEFAULT 'base',
    currency VARCHAR(3) NOT NULL,
    exchange_rate DECIMAL(20, 6) NOT NULL,
    local_amount DECIMAL(20, 6) NOT NULL,
    
    -- Fees
    sender_fee DECIMAL(20, 6) DEFAULT 0,
    transaction_fee DECIMAL(20, 6) DEFAULT 0,
    total_amount DECIMAL(20, 6) NOT NULL,
    
    -- Recipient details
    recipient_name VARCHAR(255) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    recipient_institution VARCHAR(50) NOT NULL,
    recipient_currency VARCHAR(3) NOT NULL,
    
    -- PayCrest details
    receive_address VARCHAR(42) NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'initiated',
    
    -- Settlement tracking (RESEARCH-BASED)
    settled_at TIMESTAMP WITH TIME ZONE,
    settlement_time_seconds INTEGER,
    tx_hash VARCHAR(66),
    amount_paid DECIMAL(20, 6),
    
    -- Metadata for research findings
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. `polling_attempts` - Research-Based Polling
```sql
CREATE TABLE polling_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) NOT NULL,
    attempt_number INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,
    response_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4. `settlements` - Settlement Tracking
```sql
CREATE TABLE settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) NOT NULL,
    status VARCHAR(20) NOT NULL,
    settlement_time_seconds INTEGER,
    tx_hash VARCHAR(66),
    amount_paid DECIMAL(20, 6),
    recipient_phone VARCHAR(20),
    recipient_name VARCHAR(255),
    currency VARCHAR(3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 5. `analytics_events` - Analytics Tracking
```sql
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_name VARCHAR(100) NOT NULL,
    wallet_address VARCHAR(42) NOT NULL,
    order_id UUID REFERENCES orders(id),
    properties JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 6. `webhook_events` - Webhook Compatibility
```sql
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,
    paycrest_order_id VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    signature VARCHAR(255),
    headers JSONB DEFAULT '{}',
    user_agent TEXT,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 7. `carrier_detections` - Kenyan Carrier Detection
```sql
CREATE TABLE carrier_detections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL,
    detected_carrier VARCHAR(50) NOT NULL,
    paycrest_provider VARCHAR(20) NOT NULL,
    order_id UUID REFERENCES orders(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Analytics Views

#### 1. `order_analytics` - Order Analytics
```sql
CREATE VIEW order_analytics AS
SELECT 
    o.id,
    o.paycrest_order_id,
    o.wallet_address,
    o.amount,
    o.currency,
    o.status,
    o.created_at,
    o.settled_at,
    o.settlement_time_seconds,
    u.total_orders as user_total_orders,
    u.total_volume as user_total_volume
FROM orders o
LEFT JOIN users u ON o.wallet_address = u.wallet_address;
```

#### 2. `settlement_analytics` - Settlement Analytics
```sql
CREATE VIEW settlement_analytics AS
SELECT 
    s.id,
    s.order_id,
    s.status,
    s.settlement_time_seconds,
    s.tx_hash,
    s.amount_paid,
    o.amount as order_amount,
    o.currency,
    o.wallet_address,
    s.created_at
FROM settlements s
JOIN orders o ON s.order_id = o.id;
```

#### 3. `polling_analytics` - Polling Analytics
```sql
CREATE VIEW polling_analytics AS
SELECT 
    pa.id,
    pa.order_id,
    pa.attempt_number,
    pa.status,
    pa.response_time_ms,
    pa.error_message,
    o.paycrest_order_id,
    o.wallet_address,
    pa.created_at
FROM polling_attempts pa
JOIN orders o ON pa.order_id = o.id;
```

## 🔧 Helper Functions

### 1. `track_polling_attempt` - Track Polling Attempts
```sql
CREATE OR REPLACE FUNCTION track_polling_attempt(
    p_order_id UUID,
    p_attempt_number INTEGER,
    p_status VARCHAR(20),
    p_response_time_ms INTEGER DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO polling_attempts (
        order_id,
        attempt_number,
        status,
        response_time_ms,
        error_message
    ) VALUES (
        p_order_id,
        p_attempt_number,
        p_status,
        p_response_time_ms,
        p_error_message
    );
END;
$$ LANGUAGE plpgsql;
```

### 2. `track_settlement` - Track Settlements
```sql
CREATE OR REPLACE FUNCTION track_settlement(
    p_order_id UUID,
    p_status VARCHAR(20),
    p_settlement_time_seconds INTEGER DEFAULT NULL,
    p_tx_hash VARCHAR(66) DEFAULT NULL,
    p_amount_paid DECIMAL(20, 6) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO settlements (
        order_id,
        status,
        settlement_time_seconds,
        tx_hash,
        amount_paid
    ) VALUES (
        p_order_id,
        p_status,
        p_settlement_time_seconds,
        p_tx_hash,
        p_amount_paid
    );
END;
$$ LANGUAGE plpgsql;
```

## 🧪 Testing Database

### Test Connection
```bash
npm run test-db
```

### Health Check
```bash
npm run health-check
```

### Manual Database Test
```bash
# Connect to database
psql -h localhost -U minisend_user -d minisend

# Test queries
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM polling_attempts;
SELECT COUNT(*) FROM settlements;
SELECT COUNT(*) FROM analytics_events;

# Check views
SELECT * FROM order_analytics LIMIT 5;
SELECT * FROM settlement_analytics LIMIT 5;
SELECT * FROM polling_analytics LIMIT 5;
```

## 📊 Research-Based Features

### 1. Polling Attempt Tracking
- Tracks each polling attempt with exponential backoff
- Records response times and error messages
- Enables analysis of polling efficiency

### 2. Settlement Detection
- Focuses on "settled" status for payment completion
- Tracks settlement times and transaction hashes
- Provides comprehensive settlement analytics

### 3. Carrier Detection
- Detects Kenyan mobile carriers (Safaricom, Airtel)
- Maps carriers to PayCrest providers
- Improves payment success rates

### 4. Analytics Integration
- Comprehensive event tracking
- Wallet-level analytics
- Performance monitoring

## 🔍 Troubleshooting

### Common Issues

#### 1. Connection Failed
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -h localhost -U minisend_user -d minisend
```

#### 2. Permission Denied
```bash
# Grant permissions
sudo -u postgres psql
GRANT ALL PRIVILEGES ON DATABASE minisend TO minisend_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO minisend_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO minisend_user;
```

#### 3. Schema Not Created
```bash
# Run setup manually
node scripts/setup-database.js
```

#### 4. Environment Variables
```bash
# Check environment variables
echo $DB_PASSWORD
echo $DB_HOST
echo $DB_NAME
```

## 📈 Performance Optimization

### 1. Indexes
The schema includes performance indexes:
- `idx_orders_wallet_address` - Fast wallet queries
- `idx_orders_status` - Fast status filtering
- `idx_orders_created_at` - Fast date range queries
- `idx_polling_attempts_order_id` - Fast polling queries

### 2. Connection Pooling
- Configured for 20 max connections
- 30-second idle timeout
- 2-second connection timeout

### 3. Analytics Views
- Pre-computed analytics views
- Fast aggregation queries
- Real-time dashboard support

## 🚀 Production Deployment

### 1. Environment Variables
```bash
# Production database
DB_HOST=your_production_host
DB_PORT=5432
DB_NAME=minisend_prod
DB_USER=minisend_prod_user
DB_PASSWORD=your_secure_production_password
DB_MAX_CONNECTIONS=50
DB_IDLE_TIMEOUT=60000
DB_CONNECTION_TIMEOUT=5000
```

### 2. SSL Configuration
```bash
# Enable SSL for production
DB_SSL=true
```

### 3. Monitoring
```bash
# Set up monitoring
npm run health-check
```

## 📚 Next Steps

1. **Configure PayCrest API**: Set up your PayCrest API credentials
2. **Test Polling**: Verify the research-based polling implementation
3. **Monitor Analytics**: Set up monitoring for settlement times
4. **Scale Database**: Configure for production load
5. **Backup Strategy**: Implement database backups

## 🔗 Related Documentation

- [API Documentation](./README.md#api-endpoints)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- [Research Findings](./README.md#research-based-implementation)
- [Deployment Guide](./deploy.sh)

---

**Database Status**: ✅ **Ready for Research-Based PayCrest Integration** 