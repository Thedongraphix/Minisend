# Console Logger Setup Instructions

## ✅ What We've Built

**Option 2: Console Override with Database Passthrough** is now implemented with:

1. **Smart Console Override** (`/lib/console-logger.ts`)
   - Intercepts ALL `console.log`, `console.error`, `console.warn` calls
   - Automatically redacts sensitive data (phone numbers, wallet addresses, API keys)
   - Stores logs in Supabase database
   - Environment-aware: dev shows console + database, production shows only database

2. **Zero Code Changes Required**
   - All your existing 289 `console.log` statements work unchanged
   - No risk to your offramp logic

3. **Automatic Initialization** 
   - Starts immediately when your app loads
   - Captures all console output from all components

## 🗄️ Supabase Setup Required

**Step 1: Create the Database Table**

Go to your **Supabase Dashboard → SQL Editor** and run this:

```sql
CREATE TABLE public.system_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  environment TEXT NOT NULL,
  user_agent TEXT,
  url TEXT,
  stack_trace TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_system_logs_timestamp ON public.system_logs (timestamp DESC);
CREATE INDEX idx_system_logs_level ON public.system_logs (level);
CREATE INDEX idx_system_logs_environment ON public.system_logs (environment);

-- Enable RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Enable all for service role" ON public.system_logs
  FOR ALL USING (true) WITH CHECK (true);
```

**Step 2: Verify Table Creation**

Run this test:
```bash
node scripts/test-console-logger.js
```

## 🧪 Testing the System

### Development Testing
1. Run `npm run dev`
2. Open browser console
3. You should see:
   ```
   ✅ Console logger initialized - logs will be stored in Supabase
   📊 Logger stats: { environment: "development", databaseLogging: true }
   🛠️ Development mode: logs go to both console and database
   ```

4. Trigger some actions (create an order, connect wallet, etc.)
5. Check your Supabase `system_logs` table - you should see logs appearing

### Production Testing  
1. Deploy to production
2. Visit your production URL
3. **Console should be SILENT** (no logs)
4. Trigger some actions
5. Check Supabase `system_logs` table - logs should still be stored

## 🔍 How It Works

### Development Mode
- **Console Output**: ✅ Visible (for debugging)
- **Database Storage**: ✅ All logs stored
- **Sensitive Data**: ✅ Auto-redacted in database

### Production Mode  
- **Console Output**: ❌ Silent (no console logs)
- **Database Storage**: ✅ All logs stored  
- **Sensitive Data**: ✅ Auto-redacted in database

## 📊 Monitoring Your Logs

### View Recent Logs
```sql
SELECT level, message, timestamp, environment 
FROM system_logs 
WHERE timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;
```

### View Error Summary
```sql
SELECT level, COUNT(*) as count, MAX(timestamp) as latest
FROM system_logs 
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY level
ORDER BY count DESC;
```

### Search Logs
```sql
SELECT level, message, timestamp
FROM system_logs 
WHERE message ILIKE '%payment%' 
  AND timestamp > NOW() - INTERVAL '1 day'
ORDER BY timestamp DESC;
```

## 🛡️ Security Features

- **Automatic Data Redaction**: Phone numbers, wallet addresses, API keys, transaction hashes
- **Batch Processing**: Logs are batched for performance  
- **Error Handling**: If database fails, falls back to console
- **Rate Limiting**: Built-in batching prevents database overload

## 🔧 Configuration

The logger respects these environment variables:
- `NODE_ENV`: Controls development vs production behavior
- `NEXT_PUBLIC_SUPABASE_URL`: Must be set for database logging
- `SUPABASE_SERVICE_ROLE_KEY`: Required for log storage

## ✨ Benefits

1. **Zero Console Output in Production** ✅
2. **Complete Log History in Database** ✅  
3. **No Code Changes Required** ✅
4. **Sensitive Data Protection** ✅
5. **Your Offramp Logic Unchanged** ✅

## 🚀 Next Steps

1. **Create the Supabase table** (SQL above)
2. **Test in development** (`npm run dev`)
3. **Deploy and test production** (verify console silence)
4. **Monitor your logs** in Supabase dashboard

Your console logs are now centrally managed and stored safely in your database! 🎉