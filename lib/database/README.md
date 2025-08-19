# PayCrest Database Schema

## Production Schema v2.0

The official database schema is located at: `paycrest-production-schema.sql`

### ✅ Features Included:

- **Webhook Support**: Full PayCrest webhook integration with signature verification
- **Official Status Mapping**: Only uses PayCrest's 5 official statuses
- **Real-time Updates**: Webhook events processed immediately
- **Performance Optimized**: Proper indexing for high-volume operations
- **Security**: Row Level Security (RLS) enabled
- **Timezone**: East Africa Time (EAT) configured

### 🔔 Webhook Events Supported:

1. `order.initiated` - Order initiated via API
2. `order.pending` - Order awaiting provider assignment
3. `order.validated` - Funds sent to recipient (🎯 **Use this for success notification**)
4. `order.settled` - Order completed on blockchain
5. `order.refunded` - Funds refunded to sender
6. `order.expired` - Order expired without completion

### 📊 Status Mappings:

| PayCrest Status | Internal Status | User Experience |
|----------------|----------------|-----------------|
| `pending` | `processing` | "Processing..." |
| `validated` | `completed` | "✅ Delivered!" |
| `settled` | `completed` | "✅ Delivered!" |
| `refunded` | `failed` | "❌ Refunded" |
| `expired` | `failed` | "❌ Expired" |

### 🚀 Deployment:

1. Run `paycrest-production-schema.sql` in your Supabase SQL Editor
2. Webhook endpoint: `https://minisend.xyz/api/paycrest/webhook`
3. Configure webhook URL in PayCrest dashboard

### 💡 Key Benefits:

- **Faster User Feedback**: `validated` status means money reached recipient
- **Reliable Delivery**: Webhooks eliminate polling delays
- **Audit Trail**: Complete event logging for debugging
- **Analytics Ready**: Built-in views for performance monitoring

### 🔐 Environment Variables Required:

```env
PAYCREST_API_KEY=your_api_key
PAYCREST_API_SECRET=your_api_secret  # For webhook signature verification
```