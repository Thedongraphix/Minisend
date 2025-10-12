# Leaderboard Feature Setup Guide

## ✅ Safety Confirmation

**The new `farcaster_users` table is completely safe to add to your existing database.**

- ✅ **No conflicts**: Doesn't modify or depend on any existing PayCrest tables
- ✅ **Independent**: Operates separately from your `users`, `orders`, and other tables
- ✅ **Compatible**: Uses the same timezone (Africa/Nairobi/EAT) and patterns as your existing schema
- ✅ **Non-destructive**: Uses `CREATE TABLE IF NOT EXISTS` to prevent accidental overwrites
- ✅ **Rollback-safe**: Can be dropped anytime without affecting PayCrest functionality

**Existing tables remain untouched:**
- `users`, `orders`, `paycrest_orders`, `status_history`, `fees`, `settlements`, `webhook_events`, `analytics_events`, `polling_attempts`, `carrier_detections` - all unchanged

## Database Setup

### Step 1: Create the Farcaster Users Table

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your Minisend project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the entire contents of `/supabase/migrations/create_farcaster_users_table.sql`
6. Click **Run** to execute the migration

**What this creates:**
- A new `farcaster_users` table (completely independent)
- Indexes for fast wallet and FID lookups
- RLS policies for secure access
- Auto-update trigger for `updated_at` field
- Matches your existing EAT timezone configuration

### Step 2: Verify Table Creation

Run this query in the SQL Editor to verify the table was created:

```sql
SELECT * FROM farcaster_users LIMIT 10;
```

You should see the table with these columns:
- `id` (UUID)
- `wallet_address` (TEXT)
- `fid` (INTEGER)
- `username` (TEXT)
- `display_name` (TEXT)
- `pfp_url` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Features Implemented

### 1. Leaderboard Page
- **Route**: Click "View Leaderboard" button on the home page
- **Display**: Shows top users ranked by number of daily transactions
- **Time Periods**: Today, This Week, This Month, All Time
- **User Info**: Displays Farcaster usernames, display names, and profile pictures (when available)

### 2. Ranking System
- **Points**: Based on number of successful transactions (completed, fulfilled, or settled)
- **Tiebreaker**: If users have same number of transactions, ranked by total USDC volume
- **Medals**: Top 3 users get 🥇🥈🥉 medals

### 3. Farcaster Integration
- Automatically detects if app is opened in Farcaster/Base mini app
- Retrieves user profile data (FID, username, display name, profile picture)
- Stores user data in database for leaderboard display
- Shows helpful tip if not in mini app context

### 4. Real-time Updates
- Auto-refreshes every 60 seconds
- Manual refresh button available
- Shows user's current rank if they're on the leaderboard

### 5. Mobile Responsive Design
- Optimized for mobile screens
- Matches current Minisend design patterns
- Professional glass-effect cards
- Adaptive typography and spacing

## API Endpoints

### GET /api/leaderboard
Fetches leaderboard data with rankings

**Query Parameters:**
- `period`: `today` | `week` | `month` | `all` (default: `today`)
- `limit`: Number of users to return (default: `50`)

**Response:**
```json
{
  "success": true,
  "period": "today",
  "leaderboard": [
    {
      "rank": 1,
      "wallet_address": "0x...",
      "fid": 12345,
      "username": "username",
      "display_name": "Display Name",
      "pfp_url": "https://...",
      "points": 10,
      "daily_transactions": 10,
      "total_usdc": 100.00,
      "total_local": 13000.00,
      "local_currency": "KES",
      "last_transaction": "2025-10-08T12:00:00Z"
    }
  ],
  "total_users": 25,
  "updated_at": "2025-10-08T12:00:00Z"
}
```

### POST /api/user/farcaster
Stores/updates Farcaster user profile data

**Request Body:**
```json
{
  "wallet_address": "0x...",
  "fid": 12345,
  "username": "username",
  "display_name": "Display Name",
  "pfp_url": "https://..."
}
```

## Testing the Leaderboard

### 1. Test in Development
```bash
npm run dev
```

Navigate to the app and:
1. Click "View Leaderboard" on home page
2. Verify the leaderboard displays
3. Test different time period filters (Today, Week, Month, All)
4. Test the refresh button

### 2. Test in Farcaster Mini App
1. Deploy your app to production
2. Open in Farcaster or Base app
3. Your Farcaster profile should automatically be linked to your wallet
4. Make some transactions to appear on the leaderboard

### 3. Verify Data Storage
Check that Farcaster user data is being stored:

```sql
SELECT * FROM farcaster_users ORDER BY created_at DESC;
```

## How It Works

1. **User visits leaderboard**: App checks if opened in Farcaster mini app
2. **Profile retrieval**: If in mini app, retrieves user's Farcaster profile via SDK
3. **Data storage**: Automatically stores/updates profile in `farcaster_users` table
4. **Leaderboard calculation**: API aggregates transaction data from `orders` table
5. **Profile enrichment**: Joins with `farcaster_users` to add usernames and avatars
6. **Ranking**: Sorts by transaction count, then by USDC volume
7. **Display**: Shows top users with their stats and profile info

## Design Philosophy

The leaderboard follows Minisend's design principles:
- **Professional**: Clean, modern UI without common AI styling patterns
- **Mobile-first**: Optimized for mobile devices with responsive breakpoints
- **Brand consistency**: Uses existing color scheme and glass-effect cards
- **Performance**: Efficient queries with proper indexing
- **Privacy**: Only displays public Farcaster profile data

## Troubleshooting

### Leaderboard shows no users
- Verify `orders` table has completed transactions
- Check that transactions have status: `completed`, `fulfilled`, or `settled`
- Run this query to verify:
```sql
SELECT COUNT(*) FROM orders
WHERE status IN ('completed', 'fulfilled', 'settled');
```

### Farcaster profiles not showing
- Ensure app is opened in Farcaster or Base mini app
- Check browser console for any errors
- Verify `farcaster_users` table exists and has RLS policies enabled

### Rankings seem incorrect
- Leaderboard counts only successful transactions
- Transactions are filtered by the selected time period
- Rankings update every 60 seconds (or on manual refresh)

## Future Enhancements (Optional)

- Add user achievements/badges
- Show transaction streak (consecutive days with transactions)
- Add filters by currency (KES vs NGN)
- Implement social sharing for leaderboard positions
- Add weekly/monthly winners showcase
- Gamification elements (unlock levels based on transaction count)
