#!/bin/bash

# Minisend Notification System Setup Script
# This script helps set up the notification system for Minisend

set -e

echo "🔔 Minisend Notification System Setup"
echo "======================================"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL environment variable not set"
  echo "Please set DATABASE_URL or use Supabase SQL Editor to run the migrations manually"
  echo ""
  echo "Files to run:"
  echo "  - lib/database/notification-schema.sql"
  echo "  - lib/database/add-fid-to-orders.sql"
  exit 1
fi

echo "✓ DATABASE_URL found"
echo ""

# Apply notification schema
echo "📊 Creating notification tables..."
if psql "$DATABASE_URL" -f lib/database/notification-schema.sql > /dev/null 2>&1; then
  echo "✓ Notification tables created successfully"
else
  echo "⚠️  Failed to create notification tables (they may already exist)"
fi

# Add FID column to orders
echo "📝 Adding FID column to orders table..."
if psql "$DATABASE_URL" -f lib/database/add-fid-to-orders.sql > /dev/null 2>&1; then
  echo "✓ FID column added successfully"
else
  echo "⚠️  Failed to add FID column (it may already exist)"
fi

echo ""
echo "✅ Database setup complete!"
echo ""

# Check environment variables
echo "🔍 Checking environment configuration..."
echo ""

if [ -z "$NEXT_PUBLIC_URL" ]; then
  echo "⚠️  NEXT_PUBLIC_URL not set"
  echo "   Set this to your app's public URL (e.g., https://minisend.xyz)"
else
  echo "✓ NEXT_PUBLIC_URL: $NEXT_PUBLIC_URL"
fi

if [ -z "$INTERNAL_API_KEY" ]; then
  echo "⚠️  INTERNAL_API_KEY not set"
  echo "   Generate a secure random key: openssl rand -hex 32"
  echo "   Then add to your .env.local: INTERNAL_API_KEY=<your_key>"
else
  echo "✓ INTERNAL_API_KEY configured"
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "⚠️  NEXT_PUBLIC_SUPABASE_URL not set"
else
  echo "✓ NEXT_PUBLIC_SUPABASE_URL configured"
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] && [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo "⚠️  Neither SUPABASE_SERVICE_ROLE_KEY nor NEXT_PUBLIC_SUPABASE_ANON_KEY set"
else
  echo "✓ Supabase keys configured"
fi

echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Verify your webhook URL in .well-known/farcaster.json:"
echo "   Visit: ${NEXT_PUBLIC_URL}/.well-known/farcaster.json"
echo ""
echo "2. Test webhook endpoint:"
echo "   curl ${NEXT_PUBLIC_URL}/api/webhooks"
echo ""
echo "3. Deploy your app and add it in Farcaster to trigger webhook events"
echo ""
echo "4. Read the full documentation:"
echo "   cat NOTIFICATIONS.md"
echo ""
echo "🎉 Setup complete! Your notification system is ready to use."
echo ""
