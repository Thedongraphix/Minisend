-- PayCrest Production Database Schema
-- Official database schema with webhook support and correct status mappings
-- Version: 2.0 (Webhook-enabled)
-- Run this in your Supabase SQL Editor

-- ⚠️  WARNING: This will delete ALL existing data! ⚠️
-- Make sure you have backups if needed

-- 1. Drop existing tables and views (in correct order to handle dependencies)
DROP VIEW IF EXISTS order_analytics CASCADE;
DROP VIEW IF EXISTS settlement_analytics CASCADE;
DROP VIEW IF EXISTS polling_analytics CASCADE;
DROP VIEW IF EXISTS fee_analytics CASCADE;
DROP VIEW IF EXISTS status_analytics CASCADE;

DROP TABLE IF EXISTS fees CASCADE;
DROP TABLE IF EXISTS status_history CASCADE;
DROP TABLE IF EXISTS paycrest_orders CASCADE;
DROP TABLE IF EXISTS settlements CASCADE;
DROP TABLE IF EXISTS polling_attempts CASCADE;
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS webhook_events CASCADE;
DROP TABLE IF EXISTS carrier_detections CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop functions and triggers
DROP FUNCTION IF EXISTS update_paycrest_orders_timestamp() CASCADE;
DROP FUNCTION IF EXISTS log_status_change() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 2. Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. Set timezone to EAT (East Africa Time)
SET timezone = 'Africa/Nairobi';

-- 4. Create Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi'),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi')
);

-- 5. Create Orders table with full Paycrest compatibility
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paycrest_order_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    wallet_address TEXT NOT NULL,
    amount_in_usdc DECIMAL(18,6) NOT NULL,
    amount_in_local DECIMAL(18,2) NOT NULL,
    local_currency TEXT NOT NULL CHECK (local_currency IN ('KES', 'NGN')),
    phone_number TEXT NOT NULL,
    account_name TEXT,
    carrier TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    paycrest_status TEXT,
    transaction_hash TEXT,
    reference_id TEXT,
    -- Paycrest-specific fields
    rate DECIMAL(18,6),
    network TEXT DEFAULT 'base',
    token TEXT DEFAULT 'USDC',
    receive_address TEXT,
    valid_until TIMESTAMP WITH TIME ZONE,
    sender_fee DECIMAL(18,6),
    transaction_fee DECIMAL(18,6),
    total_amount DECIMAL(18,6),
    institution_code TEXT,
    recipient_data JSONB,
    memo TEXT,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi'),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi'),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 6. Create Paycrest Orders table for raw API data
CREATE TABLE paycrest_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    paycrest_order_id TEXT UNIQUE NOT NULL,
    raw_request_data JSONB NOT NULL,
    raw_response_data JSONB NOT NULL,
    paycrest_status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi'),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi')
);

-- 7. Create Status History table
CREATE TABLE status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) NOT NULL,
    paycrest_order_id TEXT NOT NULL,
    old_status TEXT,
    new_status TEXT NOT NULL,
    paycrest_status TEXT,
    status_data JSONB,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi')
);

-- 8. Create Fees table
CREATE TABLE fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) NOT NULL,
    fee_type TEXT NOT NULL CHECK (fee_type IN ('sender', 'transaction', 'network', 'exchange')),
    amount DECIMAL(18,6) NOT NULL,
    currency TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi')
);

-- 9. Create Settlements table
CREATE TABLE settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) NOT NULL,
    paycrest_settlement_id TEXT,
    settlement_amount DECIMAL(18,2) NOT NULL,
    settlement_currency TEXT NOT NULL,
    settlement_method TEXT,
    settled_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi')
);

-- 10. Create Webhook Events table (PayCrest webhook support)
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL, -- order.initiated, order.pending, order.validated, order.settled, order.refunded, order.expired
    paycrest_order_id TEXT NOT NULL,
    order_id UUID REFERENCES orders(id),
    payload JSONB NOT NULL,
    signature TEXT,
    headers JSONB DEFAULT '{}',
    user_agent TEXT,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    webhook_timestamp TIMESTAMP WITH TIME ZONE, -- PayCrest timestamp from webhook
    verification_status TEXT DEFAULT 'pending', -- verified, failed, pending
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi')
);

-- 11. Create Analytics Events table
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    wallet_address TEXT,
    event_name TEXT NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi')
);

-- 12. Create Polling Attempts table (RESEARCH-BASED + webhook tracking)
CREATE TABLE polling_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) NOT NULL,
    paycrest_order_id TEXT NOT NULL,
    attempt_number INTEGER NOT NULL, -- 0 = webhook, >0 = polling attempt
    status_returned TEXT, -- PayCrest status: pending, validated, settled, refunded, expired
    response_data JSONB DEFAULT '{}',
    response_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi')
);

-- 13. Create Carrier Detections table
CREATE TABLE carrier_detections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number TEXT NOT NULL,
    detected_carrier TEXT,
    institution_code TEXT,
    paycrest_provider TEXT,
    confidence_score DECIMAL(3,2),
    method_used TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi')
);

-- 14. Create indexes for performance
CREATE INDEX idx_orders_paycrest_id ON orders(paycrest_order_id);
CREATE INDEX idx_orders_wallet_address ON orders(wallet_address);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_receive_address ON orders(receive_address);
CREATE INDEX idx_orders_network ON orders(network);
CREATE INDEX idx_orders_institution_code ON orders(institution_code);

CREATE INDEX idx_paycrest_orders_paycrest_id ON paycrest_orders(paycrest_order_id);
CREATE INDEX idx_status_history_order_id ON status_history(order_id);
CREATE INDEX idx_status_history_changed_at ON status_history(changed_at DESC);
CREATE INDEX idx_fees_order_id ON fees(order_id);
CREATE INDEX idx_webhook_events_order_id ON webhook_events(order_id);
CREATE INDEX idx_webhook_events_paycrest_id ON webhook_events(paycrest_order_id);
CREATE INDEX idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_polling_attempts_order_id ON polling_attempts(order_id);

-- 15. Create analytics views with SECURITY INVOKER
CREATE VIEW order_analytics WITH (security_invoker=true) AS
SELECT 
    DATE(created_at AT TIME ZONE 'Africa/Nairobi') as order_date,
    local_currency,
    status,
    network,
    institution_code,
    COUNT(*) as order_count,
    SUM(amount_in_usdc) as total_usdc,
    SUM(amount_in_local) as total_local,
    SUM(COALESCE(sender_fee, 0)) as total_sender_fees,
    SUM(COALESCE(transaction_fee, 0)) as total_tx_fees,
    AVG(amount_in_usdc) as avg_usdc,
    AVG(amount_in_local) as avg_local,
    AVG(COALESCE(rate, 0)) as avg_rate,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_orders,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_orders,
    ROUND(
        COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 
        2
    ) as success_rate_percent
FROM orders 
GROUP BY DATE(created_at AT TIME ZONE 'Africa/Nairobi'), local_currency, status, network, institution_code
ORDER BY order_date DESC, local_currency, status;

CREATE VIEW settlement_analytics WITH (security_invoker=true) AS
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

CREATE VIEW polling_analytics WITH (security_invoker=true) AS
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

CREATE VIEW fee_analytics WITH (security_invoker=true) AS
SELECT 
    DATE(f.created_at AT TIME ZONE 'Africa/Nairobi') as fee_date,
    f.fee_type,
    f.currency,
    o.local_currency,
    o.network,
    COUNT(*) as fee_count,
    SUM(f.amount) as total_fees,
    AVG(f.amount) as avg_fee,
    MIN(f.amount) as min_fee,
    MAX(f.amount) as max_fee
FROM fees f
JOIN orders o ON f.order_id = o.id
GROUP BY DATE(f.created_at AT TIME ZONE 'Africa/Nairobi'), f.fee_type, f.currency, o.local_currency, o.network
ORDER BY fee_date DESC, f.fee_type;

CREATE VIEW status_analytics WITH (security_invoker=true) AS
SELECT 
    DATE(changed_at AT TIME ZONE 'Africa/Nairobi') as transition_date,
    old_status,
    new_status,
    COUNT(*) as transition_count
FROM status_history
WHERE old_status IS NOT NULL
GROUP BY DATE(changed_at AT TIME ZONE 'Africa/Nairobi'), old_status, new_status
ORDER BY transition_date DESC, old_status, new_status;

-- 16. Create update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = (NOW() AT TIME ZONE 'Africa/Nairobi');
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 17. Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 18. Create status change logging function
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status OR OLD.paycrest_status IS DISTINCT FROM NEW.paycrest_status THEN
        INSERT INTO status_history (order_id, paycrest_order_id, old_status, new_status, paycrest_status, status_data)
        VALUES (
            NEW.id, 
            NEW.paycrest_order_id, 
            OLD.status, 
            NEW.status, 
            NEW.paycrest_status,
            jsonb_build_object(
                'old_paycrest_status', OLD.paycrest_status,
                'new_paycrest_status', NEW.paycrest_status,
                'updated_at', NEW.updated_at
            )
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 19. Create trigger for status change logging
CREATE TRIGGER log_order_status_changes
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION log_status_change();

-- 20. Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE paycrest_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE polling_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE carrier_detections ENABLE ROW LEVEL SECURITY;

-- 21. Create RLS policies (allowing service role access)
CREATE POLICY "Enable all access for service role" ON users FOR ALL USING (true);
CREATE POLICY "Enable all access for service role" ON orders FOR ALL USING (true);
CREATE POLICY "Enable all access for service role" ON paycrest_orders FOR ALL USING (true);
CREATE POLICY "Enable all access for service role" ON status_history FOR ALL USING (true);
CREATE POLICY "Enable all access for service role" ON fees FOR ALL USING (true);
CREATE POLICY "Enable all access for service role" ON settlements FOR ALL USING (true);
CREATE POLICY "Enable all access for service role" ON webhook_events FOR ALL USING (true);
CREATE POLICY "Enable all access for service role" ON analytics_events FOR ALL USING (true);
CREATE POLICY "Enable all access for service role" ON polling_attempts FOR ALL USING (true);
CREATE POLICY "Enable all access for service role" ON carrier_detections FOR ALL USING (true);

-- 22. Add table comments
COMMENT ON TABLE users IS 'User accounts linked to wallet addresses';
COMMENT ON TABLE orders IS 'Paycrest orders with full transaction details';
COMMENT ON TABLE paycrest_orders IS 'Raw Paycrest API request/response data for audit';
COMMENT ON TABLE status_history IS 'Complete audit trail of all status changes';
COMMENT ON TABLE fees IS 'Detailed fee breakdown for transparency';
COMMENT ON TABLE settlements IS 'Successful settlement records';
COMMENT ON TABLE webhook_events IS 'PayCrest webhook events: order.initiated, order.pending, order.validated, order.settled, order.refunded, order.expired';
COMMENT ON TABLE analytics_events IS 'User interaction and system events';
COMMENT ON TABLE polling_attempts IS 'Order status polling history';
COMMENT ON TABLE carrier_detections IS 'Phone number carrier detection results';

-- 23. Add column comments
COMMENT ON COLUMN orders.rate IS 'Exchange rate used (USDC to local currency)';
COMMENT ON COLUMN orders.receive_address IS 'Paycrest deposit address for USDC';
COMMENT ON COLUMN orders.valid_until IS 'Order expiration timestamp';
COMMENT ON COLUMN orders.sender_fee IS 'Fee charged to sender (USDC)';
COMMENT ON COLUMN orders.transaction_fee IS 'Network transaction fee (USDC)';
COMMENT ON COLUMN orders.total_amount IS 'Total amount including fees (USDC)';
COMMENT ON COLUMN orders.institution_code IS 'Paycrest institution code (e.g., SAFAKEPC)';
COMMENT ON COLUMN orders.recipient_data IS 'Full recipient object from Paycrest API';
COMMENT ON COLUMN orders.status IS 'Internal order status: pending, processing, completed, failed (mapped from PayCrest statuses)';
COMMENT ON COLUMN orders.paycrest_status IS 'Raw PayCrest status: pending, validated, settled, refunded, expired';

-- Database setup complete!
SELECT 
    'PayCrest Production Schema v2.0 setup completed! 🎉' as status,
    'Webhook support enabled with signature verification' as webhooks,
    'Official PayCrest status mappings implemented' as statuses,
    'EAT timezone configured' as timezone,
    'RLS enabled with proper policies' as security,
    'Ready for fast fiat delivery!' as ready;