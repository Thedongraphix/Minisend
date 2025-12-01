-- Migration: Add Pretium Payment Provider Support
-- This migration adds support for Pretium as an additional payment provider alongside PayCrest
-- Date: 2025-12-01

-- 1. Add payment provider tracking field
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'PAYCREST_KES'
CHECK (payment_provider IN ('PAYCREST_KES', 'PAYCREST_NGN', 'PRETIUM_KES'));

-- 2. Add Pretium-specific fields
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS pretium_transaction_code TEXT,
ADD COLUMN IF NOT EXISTS pretium_receipt_number TEXT,
ADD COLUMN IF NOT EXISTS till_number TEXT,
ADD COLUMN IF NOT EXISTS paybill_number TEXT,
ADD COLUMN IF NOT EXISTS paybill_account TEXT;

-- 3. Add FID field for Farcaster notifications (if not exists)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS fid INTEGER;

-- 4. Add account_number field for NGN bank transfers (if not exists)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_code TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT;

-- 5. Create indexes for Pretium fields
CREATE INDEX IF NOT EXISTS idx_orders_payment_provider ON orders(payment_provider);
CREATE INDEX IF NOT EXISTS idx_orders_pretium_transaction_code ON orders(pretium_transaction_code);
CREATE INDEX IF NOT EXISTS idx_orders_pretium_receipt_number ON orders(pretium_receipt_number);
CREATE INDEX IF NOT EXISTS idx_orders_fid ON orders(fid);

-- 6. Update existing orders to set payment_provider based on currency
UPDATE orders
SET payment_provider = CASE
    WHEN local_currency = 'NGN' THEN 'PAYCREST_NGN'
    WHEN local_currency = 'KES' AND pretium_transaction_code IS NULL THEN 'PAYCREST_KES'
    WHEN local_currency = 'KES' AND pretium_transaction_code IS NOT NULL THEN 'PRETIUM_KES'
    ELSE 'PAYCREST_KES'
END
WHERE payment_provider IS NULL OR payment_provider = 'PAYCREST_KES';

-- 7. Add column comments
COMMENT ON COLUMN orders.payment_provider IS 'Payment provider: PAYCREST_KES, PAYCREST_NGN, or PRETIUM_KES';
COMMENT ON COLUMN orders.pretium_transaction_code IS 'Pretium internal transaction code';
COMMENT ON COLUMN orders.pretium_receipt_number IS 'M-Pesa receipt/transaction code (TKT...) from Pretium';
COMMENT ON COLUMN orders.till_number IS 'M-Pesa Till Number for BUY_GOODS payments';
COMMENT ON COLUMN orders.paybill_number IS 'M-Pesa Paybill Number for PAYBILL payments';
COMMENT ON COLUMN orders.paybill_account IS 'Account number for PAYBILL payments';
COMMENT ON COLUMN orders.fid IS 'Farcaster ID for push notifications';
COMMENT ON COLUMN orders.account_number IS 'Bank account number for NGN transfers';
COMMENT ON COLUMN orders.bank_code IS 'Bank code for NGN transfers';
COMMENT ON COLUMN orders.bank_name IS 'Bank name for NGN transfers';

-- 8. Update analytics views to include payment provider
DROP VIEW IF EXISTS order_analytics CASCADE;
CREATE VIEW order_analytics WITH (security_invoker=true) AS
SELECT
    DATE(created_at AT TIME ZONE 'Africa/Nairobi') as order_date,
    local_currency,
    status,
    network,
    institution_code,
    payment_provider,
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
GROUP BY DATE(created_at AT TIME ZONE 'Africa/Nairobi'), local_currency, status, network, institution_code, payment_provider
ORDER BY order_date DESC, local_currency, status;

-- Migration complete!
SELECT
    'Pretium support added successfully! 🎉' as status,
    'Payment provider tracking enabled' as providers,
    'M-Pesa receipt numbers supported' as mpesa,
    'Ready for dual-provider operations!' as ready;
