-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone to EAT (East Africa Time)
SET timezone = 'Africa/Nairobi';

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi'),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi')
);

-- Orders table to track Paycrest orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paycrest_order_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    wallet_address TEXT NOT NULL,
    amount_in_usdc DECIMAL(18,6) NOT NULL,
    amount_in_local DECIMAL(18,2) NOT NULL,
    local_currency TEXT NOT NULL CHECK (local_currency IN ('KES', 'NGN')),
    phone_number TEXT NOT NULL,
    carrier TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    paycrest_status TEXT,
    transaction_hash TEXT,
    reference_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi'),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi'),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Settlements table to track successful completions
CREATE TABLE IF NOT EXISTS settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) NOT NULL,
    paycrest_settlement_id TEXT,
    settlement_amount DECIMAL(18,2) NOT NULL,
    settlement_currency TEXT NOT NULL,
    settlement_method TEXT,
    settled_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi')
);

-- Webhook events table to track all webhook calls
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    paycrest_order_id TEXT,
    order_id UUID REFERENCES orders(id),
    payload JSONB NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi')
);

-- Analytics events table for tracking user actions
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    wallet_address TEXT,
    event_name TEXT NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi')
);

-- Polling attempts table to track status checks
CREATE TABLE IF NOT EXISTS polling_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) NOT NULL,
    paycrest_order_id TEXT NOT NULL,
    status_returned TEXT,
    attempt_number INTEGER NOT NULL,
    response_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi')
);

-- Carrier detections table for phone number analysis
CREATE TABLE IF NOT EXISTS carrier_detections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number TEXT NOT NULL,
    detected_carrier TEXT,
    confidence_score DECIMAL(3,2),
    method_used TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi')
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_paycrest_id ON orders(paycrest_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_wallet_address ON orders(wallet_address);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_order_id ON webhook_events(order_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_polling_attempts_order_id ON polling_attempts(order_id);

-- Create analytics views (with SECURITY INVOKER to avoid the Security Advisor issues)
CREATE OR REPLACE VIEW order_analytics WITH (security_invoker=true) AS
SELECT 
    DATE(created_at AT TIME ZONE 'Africa/Nairobi') as order_date,
    local_currency,
    status,
    COUNT(*) as order_count,
    SUM(amount_in_usdc) as total_usdc,
    SUM(amount_in_local) as total_local,
    AVG(amount_in_usdc) as avg_usdc,
    AVG(amount_in_local) as avg_local
FROM orders 
GROUP BY DATE(created_at AT TIME ZONE 'Africa/Nairobi'), local_currency, status
ORDER BY order_date DESC, local_currency, status;

CREATE OR REPLACE VIEW settlement_analytics WITH (security_invoker=true) AS
SELECT 
    DATE(settled_at AT TIME ZONE 'Africa/Nairobi') as settlement_date,
    s.settlement_currency,
    COUNT(*) as settlement_count,
    SUM(s.settlement_amount) as total_settled,
    AVG(s.settlement_amount) as avg_settlement,
    AVG(EXTRACT(EPOCH FROM (s.settled_at - o.created_at))/60) as avg_settlement_time_minutes
FROM settlements s
JOIN orders o ON s.order_id = o.id
GROUP BY DATE(settled_at AT TIME ZONE 'Africa/Nairobi'), s.settlement_currency
ORDER BY settlement_date DESC, s.settlement_currency;

CREATE OR REPLACE VIEW polling_analytics WITH (security_invoker=true) AS
SELECT 
    DATE(created_at AT TIME ZONE 'Africa/Nairobi') as polling_date,
    paycrest_order_id,
    MAX(attempt_number) as max_attempts,
    COUNT(*) as total_polls,
    MIN(created_at) as first_poll,
    MAX(created_at) as last_poll
FROM polling_attempts
GROUP BY DATE(created_at AT TIME ZONE 'Africa/Nairobi'), paycrest_order_id
ORDER BY polling_date DESC, paycrest_order_id;

-- Update triggers to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = (NOW() AT TIME ZONE 'Africa/Nairobi');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();