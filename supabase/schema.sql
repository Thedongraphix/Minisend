-- MiniSend Supabase Schema
-- This file contains all the database tables, indexes, and policies for the app

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT UNIQUE NOT NULL,
    farcaster_fid BIGINT,
    farcaster_username TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Preferences
    preferred_currency TEXT DEFAULT 'KES',
    notification_preferences JSONB DEFAULT '{"email": false, "push": true, "webhook": false}'::jsonb,
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for users
CREATE INDEX idx_users_wallet_address ON public.users(wallet_address);
CREATE INDEX idx_users_farcaster_fid ON public.users(farcaster_fid);
CREATE INDEX idx_users_created_at ON public.users(created_at);

-- =============================================
-- PAYMENT ORDERS TABLE
-- =============================================
CREATE TABLE public.payment_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- PayCrest integration
    paycrest_order_id TEXT UNIQUE NOT NULL,
    paycrest_reference TEXT NOT NULL,
    
    -- User information
    user_id UUID REFERENCES public.users(id),
    wallet_address TEXT NOT NULL,
    
    -- Transaction details
    amount DECIMAL(18, 6) NOT NULL,
    token TEXT NOT NULL DEFAULT 'USDC',
    network TEXT NOT NULL DEFAULT 'base',
    currency TEXT NOT NULL, -- KES, NGN, etc.
    exchange_rate DECIMAL(18, 6) NOT NULL,
    local_amount DECIMAL(18, 2) NOT NULL,
    
    -- Fees
    sender_fee DECIMAL(18, 6) DEFAULT 0,
    transaction_fee DECIMAL(18, 6) DEFAULT 0,
    total_amount DECIMAL(18, 6) NOT NULL,
    
    -- Recipient details
    recipient_name TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    recipient_institution TEXT NOT NULL, -- SAFARICOM, AIRTEL, etc.
    recipient_currency TEXT NOT NULL,
    
    -- PayCrest response data
    receive_address TEXT NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'payment_order.pending',
    -- payment_order.pending, payment_order.validated, payment_order.settled, payment_order.refunded, payment_order.expired
    
    -- Blockchain tracking
    transaction_hash TEXT,
    block_number BIGINT,
    gas_used BIGINT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    validated_at TIMESTAMP WITH TIME ZONE,
    settled_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata and debugging
    metadata JSONB DEFAULT '{}'::jsonb,
    error_details JSONB
);

-- Create indexes for payment_orders
CREATE INDEX idx_payment_orders_paycrest_order_id ON public.payment_orders(paycrest_order_id);
CREATE INDEX idx_payment_orders_user_id ON public.payment_orders(user_id);
CREATE INDEX idx_payment_orders_wallet_address ON public.payment_orders(wallet_address);
CREATE INDEX idx_payment_orders_status ON public.payment_orders(status);
CREATE INDEX idx_payment_orders_created_at ON public.payment_orders(created_at DESC);
CREATE INDEX idx_payment_orders_transaction_hash ON public.payment_orders(transaction_hash);
CREATE INDEX idx_payment_orders_recipient_phone ON public.payment_orders(recipient_phone);

-- =============================================
-- WEBHOOK EVENTS TABLE
-- =============================================
CREATE TABLE public.webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Event details
    event_type TEXT NOT NULL, -- payment_order.pending, payment_order.validated, etc.
    order_id UUID REFERENCES public.payment_orders(id),
    paycrest_order_id TEXT NOT NULL,
    
    -- Webhook data
    payload JSONB NOT NULL,
    signature TEXT NOT NULL,
    
    -- Processing status
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    processing_error TEXT,
    
    -- Timestamps
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Raw request data for debugging
    headers JSONB,
    user_agent TEXT
);

-- Create indexes for webhook_events
CREATE INDEX idx_webhook_events_event_type ON public.webhook_events(event_type);
CREATE INDEX idx_webhook_events_order_id ON public.webhook_events(order_id);
CREATE INDEX idx_webhook_events_paycrest_order_id ON public.webhook_events(paycrest_order_id);
CREATE INDEX idx_webhook_events_processed ON public.webhook_events(processed);
CREATE INDEX idx_webhook_events_received_at ON public.webhook_events(received_at DESC);

-- =============================================
-- ANALYTICS TABLE
-- =============================================
CREATE TABLE public.analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Event tracking
    event_name TEXT NOT NULL, -- 'order_created', 'transaction_started', 'payment_completed', etc.
    user_id UUID REFERENCES public.users(id),
    wallet_address TEXT,
    order_id UUID REFERENCES public.payment_orders(id),
    
    -- Event properties
    properties JSONB DEFAULT '{}'::jsonb,
    
    -- Context
    user_agent TEXT,
    ip_address INET,
    referrer TEXT,
    
    -- Farcaster context
    farcaster_context JSONB,
    
    -- Timestamps
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Session tracking
    session_id UUID,
    
    -- A/B testing and experiments
    experiment_groups JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for analytics_events
CREATE INDEX idx_analytics_events_event_name ON public.analytics_events(event_name);
CREATE INDEX idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX idx_analytics_events_wallet_address ON public.analytics_events(wallet_address);
CREATE INDEX idx_analytics_events_timestamp ON public.analytics_events(timestamp DESC);
CREATE INDEX idx_analytics_events_session_id ON public.analytics_events(session_id);

-- =============================================
-- CARRIER DETECTION LOGS TABLE
-- =============================================
CREATE TABLE public.carrier_detection_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number TEXT NOT NULL,
    detected_carrier TEXT NOT NULL, -- SAFARICOM, AIRTEL, TELKOM, EQUITEL
    paycrest_provider TEXT NOT NULL, -- MPESA, AIRTEL
    confidence_score DECIMAL(3, 2) DEFAULT 1.0,
    
    -- Context
    order_id UUID REFERENCES public.payment_orders(id),
    user_id UUID REFERENCES public.users(id),
    
    -- Validation
    is_correct BOOLEAN, -- Can be updated if we get feedback
    actual_carrier TEXT, -- If different from detected
    
    -- Timestamps
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for carrier_detection_logs
CREATE INDEX idx_carrier_detection_logs_phone_number ON public.carrier_detection_logs(phone_number);
CREATE INDEX idx_carrier_detection_logs_detected_carrier ON public.carrier_detection_logs(detected_carrier);
CREATE INDEX idx_carrier_detection_logs_order_id ON public.carrier_detection_logs(order_id);
CREATE INDEX idx_carrier_detection_logs_detected_at ON public.carrier_detection_logs(detected_at DESC);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_orders_updated_at BEFORE UPDATE ON public.payment_orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically set validation timestamp
CREATE OR REPLACE FUNCTION set_validation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'payment_order.validated' AND OLD.status != 'payment_order.validated' THEN
        NEW.validated_at = NOW();
    END IF;
    
    IF NEW.status = 'payment_order.settled' AND OLD.status != 'payment_order.settled' THEN
        NEW.settled_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for validation timestamps
CREATE TRIGGER set_payment_order_timestamps BEFORE UPDATE ON public.payment_orders 
    FOR EACH ROW EXECUTE FUNCTION set_validation_timestamp();

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carrier_detection_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (wallet_address = current_setting('app.current_user_wallet', TRUE));

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (wallet_address = current_setting('app.current_user_wallet', TRUE));

-- Payment orders policies
CREATE POLICY "Users can view own orders" ON public.payment_orders
    FOR SELECT USING (wallet_address = current_setting('app.current_user_wallet', TRUE));

CREATE POLICY "Users can create orders" ON public.payment_orders
    FOR INSERT WITH CHECK (wallet_address = current_setting('app.current_user_wallet', TRUE));

-- Service role can access everything (for API operations)
CREATE POLICY "Service role full access users" ON public.users
    FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Service role full access orders" ON public.payment_orders
    FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Service role full access webhooks" ON public.webhook_events
    FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Service role full access analytics" ON public.analytics_events
    FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Service role full access carrier logs" ON public.carrier_detection_logs
    FOR ALL USING (current_setting('role') = 'service_role');

-- =============================================
-- VIEWS FOR EASY QUERYING
-- =============================================

-- User transaction summary view
CREATE VIEW public.user_transaction_summary AS
SELECT 
    u.wallet_address,
    u.farcaster_username,
    COUNT(po.*) as total_transactions,
    COUNT(CASE WHEN po.status = 'payment_order.validated' THEN 1 END) as successful_transactions,
    COUNT(CASE WHEN po.status = 'payment_order.pending' THEN 1 END) as pending_transactions,
    COUNT(CASE WHEN po.status = 'payment_order.refunded' THEN 1 END) as refunded_transactions,
    SUM(po.amount) as total_volume_usdc,
    SUM(po.local_amount) as total_volume_local,
    AVG(po.exchange_rate) as avg_exchange_rate,
    MIN(po.created_at) as first_transaction,
    MAX(po.created_at) as last_transaction
FROM public.users u
LEFT JOIN public.payment_orders po ON u.id = po.user_id
GROUP BY u.id, u.wallet_address, u.farcaster_username;

-- Daily analytics view
CREATE VIEW public.daily_analytics AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN status = 'payment_order.validated' THEN 1 END) as successful_orders,
    SUM(amount) as total_volume_usdc,
    SUM(local_amount) as total_volume_local,
    AVG(exchange_rate) as avg_exchange_rate,
    COUNT(DISTINCT wallet_address) as unique_users,
    COUNT(DISTINCT recipient_phone) as unique_recipients
FROM public.payment_orders
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- =============================================
-- SAMPLE DATA (for testing)
-- =============================================

-- Insert a test user
INSERT INTO public.users (wallet_address, farcaster_fid, farcaster_username) 
VALUES ('0x1234567890123456789012345678901234567890', 12345, 'testuser')
ON CONFLICT (wallet_address) DO NOTHING;

-- =============================================
-- COMMENTS AND DOCUMENTATION
-- =============================================

COMMENT ON TABLE public.users IS 'User profiles with wallet addresses and Farcaster integration';
COMMENT ON TABLE public.payment_orders IS 'PayCrest payment orders with full transaction lifecycle tracking';
COMMENT ON TABLE public.webhook_events IS 'PayCrest webhook events for real-time status updates';
COMMENT ON TABLE public.analytics_events IS 'Application analytics and user behavior tracking';
COMMENT ON TABLE public.carrier_detection_logs IS 'Logs for Kenyan mobile carrier detection accuracy';

COMMENT ON COLUMN public.payment_orders.status IS 'PayCrest order status: payment_order.pending, payment_order.validated, payment_order.settled, payment_order.refunded, payment_order.expired';
COMMENT ON COLUMN public.payment_orders.validated_at IS 'Timestamp when funds were sent to recipient (payment_order.validated)';
COMMENT ON COLUMN public.payment_orders.settled_at IS 'Timestamp when transaction was settled on blockchain (payment_order.settled)';