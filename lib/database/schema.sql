-- Minisend PayCrest Database Schema for Supabase
-- Research-Based Implementation with Polling Support

-- Users table for wallet tracking
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_orders INTEGER DEFAULT 0,
    total_volume DECIMAL(20, 6) DEFAULT 0,
    preferred_currency VARCHAR(3) DEFAULT 'KES'
);

-- Orders table for PayCrest order tracking
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Webhook events table (for compatibility, even though PayCrest doesn't send webhooks)
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name VARCHAR(100) NOT NULL,
    wallet_address VARCHAR(42) NOT NULL,
    order_id UUID REFERENCES orders(id),
    properties JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Polling attempts table (RESEARCH-BASED)
CREATE TABLE IF NOT EXISTS polling_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) NOT NULL,
    attempt_number INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,
    response_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Carrier detection table (for Kenyan numbers)
CREATE TABLE IF NOT EXISTS carrier_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) NOT NULL,
    detected_carrier VARCHAR(50) NOT NULL,
    paycrest_provider VARCHAR(20) NOT NULL,
    order_id UUID REFERENCES orders(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settlement tracking table (RESEARCH-BASED)
CREATE TABLE IF NOT EXISTS settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_wallet_address ON orders(wallet_address);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_paycrest_id ON orders(paycrest_order_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_order_id ON webhook_events(paycrest_order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);

CREATE INDEX IF NOT EXISTS idx_analytics_events_wallet ON analytics_events(wallet_address);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);

CREATE INDEX IF NOT EXISTS idx_polling_attempts_order_id ON polling_attempts(order_id);
CREATE INDEX IF NOT EXISTS idx_polling_attempts_created_at ON polling_attempts(created_at);

CREATE INDEX IF NOT EXISTS idx_carrier_detections_phone ON carrier_detections(phone_number);
CREATE INDEX IF NOT EXISTS idx_carrier_detections_order_id ON carrier_detections(order_id);

CREATE INDEX IF NOT EXISTS idx_settlements_order_id ON settlements(order_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);

-- Views for analytics
CREATE OR REPLACE VIEW order_analytics AS
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

CREATE OR REPLACE VIEW settlement_analytics AS
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

CREATE OR REPLACE VIEW polling_analytics AS
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

-- Insert default data for testing
INSERT INTO users (wallet_address, preferred_currency) VALUES 
('0x742d35Cc6634C0532925a3b8D400b6b2e5e1C6eD', 'KES'),
('0x1234567890123456789012345678901234567890', 'NGN')
ON CONFLICT (wallet_address) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE orders IS 'PayCrest orders with research-based settlement tracking';
COMMENT ON TABLE webhook_events IS 'Webhook events for compatibility (PayCrest does not send webhooks)';
COMMENT ON TABLE polling_attempts IS 'Research-based polling attempts with exponential backoff';
COMMENT ON TABLE settlements IS 'Settlement tracking focused on settled status detection';
COMMENT ON TABLE carrier_detections IS 'Kenyan carrier detection for M-Pesa integration';
COMMENT ON TABLE analytics_events IS 'Analytics events for monitoring and reporting';

COMMENT ON COLUMN orders.status IS 'Order status: initiated, pending, settled, failed, cancelled';
COMMENT ON COLUMN orders.settled_at IS 'Timestamp when order was settled (RESEARCH-BASED)';
COMMENT ON COLUMN orders.settlement_time_seconds IS 'Time from creation to settlement in seconds';
COMMENT ON COLUMN orders.metadata IS 'JSON metadata including carrier info, original phone input, API version'; 