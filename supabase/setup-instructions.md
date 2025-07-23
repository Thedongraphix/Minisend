# MiniSend Supabase Setup Instructions

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in/create account
3. Click "New Project"
4. Choose organization and set project details:
   - **Name**: MiniSend
   - **Database Password**: Use a strong password (save it!)
   - **Region**: Choose closest to your users
5. Wait for project creation (2-3 minutes)

## Step 2: Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the entire contents of `supabase/schema-clean.sql`
4. Paste into the SQL editor
5. Click **"Run"** (this may take 30-60 seconds)
6. You should see "Success. No rows returned" - this is normal!

## Step 3: Get Your Credentials

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy these values:

```bash
# Project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co

# Anon/Public Key (safe for client-side)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Role Key (keep secret! server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 4: Add Environment Variables

Add these to your `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## Step 5: Verify Setup

Test your setup by running:

```bash
npm run dev
```

Then check the browser console for any Supabase connection errors.

## Step 6: Check Database Tables

In Supabase dashboard, go to **Table Editor**. You should see these tables:
- ✅ users
- ✅ payment_orders  
- ✅ webhook_events
- ✅ analytics_events
- ✅ carrier_detection_logs

## Step 7: Test with Sample Data

Your schema automatically includes a test user. You can verify by running this query in SQL Editor:

```sql
SELECT * FROM users;
```

You should see one test user.

## Troubleshooting

### Error: "syntax error at or near..."
- Make sure you copied the entire `schema-clean.sql` file
- Check that your copy/paste didn't add any extra characters
- Try running smaller sections of the schema if needed

### Error: "permission denied"
- Make sure you're using the Service Role key for backend operations
- Check that RLS policies are set up correctly

### Error: "relation does not exist"
- Ensure all tables were created successfully
- Check the Table Editor to verify table creation
- Re-run the schema if some tables are missing

### Connection Issues
- Verify your Supabase URL and keys are correct
- Check that environment variables are loaded properly
- Ensure your project is active (not paused)

## Next Steps

Once setup is complete:
1. Your app will automatically start tracking transactions in the database
2. Webhook events will be stored for debugging
3. User transaction history will be available
4. Analytics dashboard will show insights at `/api/analytics/dashboard`

## Security Notes

⚠️ **Important**: 
- Never commit your Service Role key to version control
- Only use Service Role key on the backend/server
- The Anon key is safe for client-side use
- All tables have Row Level Security enabled

## Database Maintenance

Consider setting up:
- Automatic backups (available in Supabase Pro)
- Database monitoring alerts
- Regular cleanup of old webhook events
- Performance monitoring for slow queries

Your MiniSend app is now fully integrated with Supabase! 🚀