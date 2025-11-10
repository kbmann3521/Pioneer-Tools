# Tools Hub - Authentication & API System Setup Guide

This guide walks you through setting up the complete authentication, API key management, rate limiting, and billing system.

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Supabase Setup](#supabase-setup)
3. [Running Database Migrations](#running-database-migrations)
4. [Stripe Configuration](#stripe-configuration)
5. [Authentication Flow](#authentication-flow)
6. [API Key Management](#api-key-management)
7. [Rate Limiting](#rate-limiting)
8. [Deployment to Vercel](#deployment-to-vercel)

## Environment Variables

All credentials have been set in your dev environment. For production/deployment, update these in your `.env.local` or hosting platform:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://rmjazwfzamvwemmbgwll.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=your_service_key_here (get from Supabase Settings > API > Service Key)

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51MrsUYL...
STRIPE_SECRET_KEY=sk_test_51MrsUYL...
STRIPE_PRO_PRICE_ID=price_1MrsUYL... (create in Stripe dashboard)
STRIPE_WEBHOOK_SECRET=whsec_... (get from webhook endpoint in Stripe)

# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL=https://actual-kangaroo-34931.upstash.io
UPSTASH_REDIS_REST_TOKEN=AYhzAAIncDI...
```

## Supabase Setup

### 1. Access Your Supabase Project

Your project is already created at: https://rmjazwfzamvwemmbgwll.supabase.co

### 2. Enable Email Authentication

1. Go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. Configure email templates if needed (Settings → Email Templates)

### 3. Configure Row Level Security (RLS)

RLS is already configured in the migration. All tables have policies to ensure users can only access their own data.

## Running Database Migrations

### Option 1: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `supabase/migrations/001_create_users_profile.sql`
5. Paste it into the editor and click **Run**

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref rmjazwfzamvwemmbgwll

# Run migrations
supabase migration up
```

### What the Migration Creates

**`users_profile` table:**
- `id` (UUID): User ID, references auth.users
- `plan` (TEXT): 'free' or 'pro'
- `rate_limit` (INTEGER): Requests per minute (200 for free, 2000 for pro)
- `stripe_customer_id` (TEXT): Stripe customer ID for billing
- `created_at` / `updated_at`: Timestamps

**`api_keys` table:**
- `id` (UUID): Key ID
- `user_id` (UUID): References users_profile
- `key` (TEXT): The actual API key (format: pk_xxx)
- `label` (TEXT): User-friendly name for the key
- `last_used` (TIMESTAMP): When the key was last used
- `created_at` (TIMESTAMP): When the key was created

**Auto-triggers:**
- When a user signs up, a profile is automatically created with plan='free' and rate_limit=200

## Stripe Configuration

### 1. Get Your Test Keys

Your keys are already set in the environment. You can find them in your Stripe Dashboard:
- Dashboard → **Developers** → **API Keys**
- Publishable Key: `pk_test_51MrsUYL...`
- Secret Key: `sk_test_51MrsUYL...`

### 2. Create a Product and Price

1. Go to **Products** → **Create Product**
2. Name: "Tools Hub Pro"
3. Price: $9.99/month (or your desired price)
4. Billing period: Monthly
5. Copy the **Price ID** (looks like `price_1MrsUYL...`)
6. Update `STRIPE_PRO_PRICE_ID` env var with this ID

### 3. Set Up Webhook Endpoint

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the **Signing Secret** (looks like `whsec_...`)
6. Update `STRIPE_WEBHOOK_SECRET` env var

**Testing webhooks locally:**
```bash
# Use Stripe CLI to forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/stripe/webhook

# In another terminal, trigger a test event
stripe trigger payment_intent.succeeded
```

## Authentication Flow

### User Signup

1. User visits `/auth`
2. Enters email and password
3. Clicks "Create Account"
4. Supabase creates auth user + auto-creates profile record
5. User redirected to `/dashboard`

### Login

1. User visits `/auth`
2. Enters email and password
3. Clicks "Sign In"
4. User redirected to `/dashboard`

### Protected Routes

All routes in `/app/dashboard` require authentication. The `useAuth()` hook provides:

```typescript
const { user, session, loading, signUp, signIn, signOut } = useAuth()

if (!user) {
  router.push('/auth') // Redirect to login
}
```

## API Key Management

### Creating an API Key

1. User goes to Dashboard
2. Click "Create New Key"
3. Enter a label (e.g., "Production", "Testing")
4. Click "Create Key"
5. **IMPORTANT:** Copy the key immediately - it won't be shown again
6. Key format: `pk_` + 32 random hex characters

### Using an API Key

```bash
curl -X POST https://yoursite.com/api/tools/case-converter \
  -H "Authorization: Bearer pk_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"text": "hello world"}'
```

### Deleting an API Key

1. Go to Dashboard
2. Find the key in the "API Keys" table
3. Click "Delete"
4. Confirm deletion

## Rate Limiting

### How It Works

1. Each API request includes an `Authorization: Bearer pk_xxx` header
2. Middleware validates the key against the database
3. User's plan determines their rate limit:
   - **Free:** 200 requests/minute
   - **Pro:** 2000 requests/minute
4. Upstash Redis tracks request count per minute
5. If limit exceeded, returns `429 Too Many Requests`

### Response Format

**Success:**
```json
{
  "tool": "case-converter",
  "status": "ok",
  "rateLimit": {
    "remaining": 195,
    "resetTime": 1234567890
  }
}
```

**Rate Limited:**
```json
{
  "error": "Rate limit exceeded. Limit: 200/minute"
}
```

### Testing Rate Limits

```bash
# Create an API key first
# Then make rapid requests
for i in {1..250}; do
  curl -X POST https://yoursite.com/api/tools/example \
    -H "Authorization: Bearer pk_your_key" \
    -H "Content-Type: application/json" \
    -d '{"input": "test"}'
done

# You'll get 429 after 200 requests
```

## Adding More Tool Endpoints

Each tool needs an API endpoint under `/app/api/tools/[toolName]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { validateAndLimitApiKey } from '@/lib/middleware/rateLimit'

export async function POST(request: NextRequest) {
  try {
    // 1. Validate API key & check rate limit
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 })
    }

    const rateLimit = await validateAndLimitApiKey(authHeader)
    if (!rateLimit.success) {
      return NextResponse.json({ error: rateLimit.message }, { status: 429 })
    }

    // 2. Parse request
    const body = await request.json()

    // 3. Call your tool logic
    const result = await processToolLogic(body)

    // 4. Return result with rate limit info
    return NextResponse.json({
      tool: 'your-tool',
      status: 'ok',
      result,
      rateLimit: {
        remaining: rateLimit.remaining,
        resetTime: rateLimit.resetTime,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

## Deployment to Vercel

### 1. Connect Your Repository

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your Git repository
4. Vercel auto-detects Next.js configuration

### 2. Set Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add all vars from `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_PRO_PRICE_ID
STRIPE_WEBHOOK_SECRET
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

### 3. Update Stripe Webhook URL

1. Go to Stripe Dashboard → Webhooks
2. Update the endpoint URL to: `https://yourvercel.app/api/stripe/webhook`
3. Update `STRIPE_WEBHOOK_SECRET` env var with the new signing secret

### 4. Deploy

```bash
# Push to main branch
git push origin main

# Vercel automatically deploys on push
```

## Testing the System Locally

```bash
# 1. Start dev server
npm run dev

# 2. Sign up at http://localhost:3000/auth
# 3. Go to Dashboard at http://localhost:3000/dashboard
# 4. Create an API key
# 5. Test the API

curl -X POST http://localhost:3000/api/tools/example \
  -H "Authorization: Bearer pk_your_key" \
  -H "Content-Type: application/json" \
  -d '{"input": "test"}'
```

## Troubleshooting

### "Missing Supabase URL" Error

Make sure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in environment variables and dev server is restarted.

### "Invalid API Key" on API Calls

1. Check the key exists in Supabase dashboard → `api_keys` table
2. Verify the user's `users_profile` record exists
3. Make sure the Authorization header format is: `Authorization: Bearer pk_xxx`

### Rate Limit Not Working

1. Check Upstash Redis credentials are correct
2. Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
3. Check Redis connectivity at https://console.upstash.com

### Stripe Webhook Not Triggering

1. Verify `STRIPE_WEBHOOK_SECRET` is correct
2. Check Stripe Dashboard → Webhooks → Event logs
3. Ensure endpoint URL is publicly accessible (not localhost)
4. For local testing, use Stripe CLI to forward webhooks

## File Structure

```
app/
├── auth/page.tsx                           # Login/Signup
├── dashboard/page.tsx                      # User dashboard
├── context/AuthContext.tsx                 # Auth state management
├── api/
│   ├── account/api-keys/route.ts          # Create/list keys (GET, POST)
│   ├── account/api-keys/[keyId]/route.ts  # Delete key (DELETE)
│   ├── stripe/
│   │   ├── checkout/route.ts              # Create checkout session
│   │   └── webhook/route.ts               # Handle Stripe events
│   └── tools/
│       ├── example/route.ts               # Example tool endpoint
│       └── [other tools]/route.ts
lib/
├── supabaseClient.ts                       # Public Supabase client
├── supabaseAdmin.ts                        # Admin client (server-side)
├── stripe.ts                               # Stripe helper
└── middleware/rateLimit.ts                 # Rate limiting logic
supabase/
└── migrations/
    └── 001_create_users_profile.sql       # Database schema
```

## Next Steps

1. ✅ Environment variables configured
2. ✅ Supabase project created
3. ✅ Auth system implemented
4. ✅ API key management implemented
5. ✅ Rate limiting configured
6. 📝 **TODO:** Run database migrations
7. �� **TODO:** Create Stripe product and price
8. 📝 **TODO:** Set up Stripe webhook endpoint
9. 📝 **TODO:** Deploy to Vercel
10. 📝 **TODO:** Add more tool API endpoints as needed

## Support

- **Supabase Docs:** https://supabase.com/docs
- **Stripe Docs:** https://stripe.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Upstash Docs:** https://upstash.com/docs
