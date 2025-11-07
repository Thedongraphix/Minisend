#!/bin/bash
# ============================================
# Neynar Notification Status Checker
# ============================================

echo "🔍 Neynar Notification Diagnostic"
echo "===================================="
echo ""

# Load environment
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# 1. Check API key
echo "1. Checking Neynar API Key..."
if [ -z "$NEYNAR_API_KEY" ]; then
    echo "   ❌ NEYNAR_API_KEY not found in .env"
    exit 1
else
    echo "   ✅ API Key found: ${NEYNAR_API_KEY:0:8}..."
fi
echo ""

# 2. Check manifest webhook URL
echo "2. Checking manifest webhook URL..."
WEBHOOK_URL=$(curl -s https://minisend.xyz/.well-known/farcaster.json | jq -r '.frame.webhookUrl')
echo "   Webhook URL: $WEBHOOK_URL"
if [[ $WEBHOOK_URL == *"neynar.com"* ]]; then
    echo "   ✅ Correctly configured for Neynar"
else
    echo "   ❌ Webhook URL doesn't point to Neynar"
fi
echo ""

# 3. Test Neynar API connection
echo "3. Testing Neynar API connection..."
echo "   Attempting to fetch app info..."

# Try to get app info (this will fail if API key is invalid)
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "api_key: $NEYNAR_API_KEY" \
  "https://api.neynar.com/v2/farcaster/user/bulk?fids=3")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ Neynar API connection successful"
else
    echo "   ❌ Neynar API error: HTTP $HTTP_CODE"
    echo "   Response: $BODY"
fi
echo ""

# 4. Instructions
echo "4. Next Steps:"
echo "   ============"
echo ""
echo "   To enable notifications, a user must:"
echo "   1. Open Minisend in Farcaster app (Warpcast)"
echo "   2. Click 'Enable Notifications' button"
echo "   3. Confirm in Farcaster client"
echo ""
echo "   Test with your own FID:"
echo "   $ npm run test-notification YOUR_FID"
echo ""
echo "   Check Neynar dev portal for subscribers:"
echo "   https://dev.neynar.com/"
echo ""
