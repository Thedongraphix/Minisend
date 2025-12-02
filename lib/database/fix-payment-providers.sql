-- Fix incorrect payment_provider values
-- NGN transactions should be PAYCREST_NGN
-- KES transactions should be PRETIUM_KES (Pretium is primary provider for KES)

-- Fix NGN transactions
UPDATE orders
SET payment_provider = 'PAYCREST_NGN'
WHERE local_currency = 'NGN'
  AND payment_provider != 'PAYCREST_NGN';

-- Fix KES transactions - should all be PRETIUM_KES
UPDATE orders
SET payment_provider = 'PRETIUM_KES'
WHERE local_currency = 'KES'
  AND payment_provider != 'PRETIUM_KES';

-- Verify the fix
SELECT
    local_currency,
    payment_provider,
    COUNT(*) as count
FROM orders
GROUP BY local_currency, payment_provider
ORDER BY local_currency, payment_provider;
