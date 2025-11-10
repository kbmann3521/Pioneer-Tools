# Next Steps - Complete the Setup

Your authentication and API system has been scaffolded! Follow these steps to get everything working.

## What's Been Done ✅

- ✅ Environment variables configured
- ✅ Supabase client libraries created
- ✅ Authentication system implemented (signup/login)
- ✅ API key management system created
- ✅ Rate limiting middleware implemented
- ✅ Stripe integration scaffolded
- ✅ All API routes created
- ✅ Dashboard with key management UI
- ✅ Complete documentation
- ✅ Dev server restarted

## What You Need to Do 📝

### Step 1: Run Supabase Database Migrations (REQUIRED)

Your database tables don't exist yet. You must create them.

**Option A: Using Supabase Dashboard (Easiest)**

1. Go to https://rmjazwfzamvwemmbgwll.supabase.co
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Open the file `supabase/migrations/001_create_users_profile.sql` in this repo
5. Copy the entire SQL code
6. Paste it into the Supabase SQL editor
7. Click **Run** (blue button at bottom right)
8. Wait for "Success" message

**Option B: Using Supabase CLI**

```bash
npm install -g supabase
supabase login
supabase link --project-ref rmjazwfzamvwemmbgwll
supabase migration up
```

**What gets created:**
- `users_profile` table (user plans and rate limits)
- `api_keys` table (user API keys)
- Row-level security policies
- Auto-trigger to create profile when user signs up

---

### Step 2: Test Authentication Locally

Once migrations are done, test the auth flow:

1. Go to http://localhost:3000/auth
2. Click "Sign Up"
3. Enter a test email and password
4. You should be redirected to the dashboard
5. Check Supabase Dashboard → Table Editor → `users_profile` - your user should be there!

---

### Step 3: Create a Stripe Product & Price (For Billing)

To enable the "Upgrade to Pro" feature:

1. Go to https://dashboard.stripe.com
2. Navigate to **Products** (left sidebar)
3. Click **+ Create Product**
4. **Name:** "Tools Hub Pro"
5. **Description:** "Upgrade to Pro for higher rate limits"
6. Click **Create product**
7. Under "Pricing," click **+ Add pricing**
8. **Price:** $9.99/month (or your desired price)
9. Click **Create price**
10. Copy the **Price ID** (looks like `price_1Mrsu...`)
11. Add to your env vars:
    ```
    STRIPE_PRO_PRICE_ID=price_1Mrsu... (the one you just copied)
    ```
12. Restart dev server: `npm run dev`

---

### Step 4: Set Up Stripe Webhook (For Payment Processing)

This ensures users automatically upgrade when payment succeeds.

**For Local Testing:**

```bash
# In a new terminal, install and use Stripe CLI
npm install -g @stripe/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Note the signing secret that appears - copy it!
# Should look like: whsec_test_...
```

Add to env vars:
```
STRIPE_WEBHOOK_SECRET=whsec_test_... (the one from above)
```

Restart dev server.

**For Production (Vercel):**

1. Go to https://dashboard.stripe.com → **Webhooks**
2. Click **+ Add endpoint**
3. **URL:** `https://yourdomain.vercel.app/api/stripe/webhook`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click **Create endpoint**
6. Copy the **Signing secret**
7. Add to Vercel environment variables: `STRIPE_WEBHOOK_SECRET`

---

### Step 5: Add Service Key to Environment (For Admin Operations)

The system can work without this for now, but you should add it for production:

1. Go to Supabase Dashboard → **Settings** → **API**
2. Copy the **Service Role Key** (NOT the anon key)
3. Add to env vars:
   ```
   SUPABASE_SERVICE_KEY=your_service_key_here
   ```

---

### Step 6: Test the Full Flow

```bash
# 1. Make sure dev server is running
npm run dev

# 2. Sign up at http://localhost:3000/auth

# 3. Go to dashboard at http://localhost:3000/dashboard

# 4. Create an API key
# - Click "Create New Key"
# - Enter label (e.g., "Test Key")
# - Click "Create Key"
# - Copy the key (format: pk_xxx)

# 5. Test API with your key
curl -X POST http://localhost:3000/api/tools/example \
  -H "Authorization: Bearer pk_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"input": "hello world"}'

# Should return success with rate limit info
```

---

### Step 7: Add API Endpoints for Your Tools

Each tool needs an endpoint under `/app/api/tools/[toolName]/route.ts`.

There's already an example at `/app/api/tools/example/route.ts`.

Template for a new endpoint:

```typescript
// /app/api/tools/my-tool/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { validateAndLimitApiKey } from '@/lib/middleware/rateLimit'
import { myToolLogic } from '@/lib/tools/my-tool'

export async function POST(request: NextRequest) {
  try {
    // Validate API key & rate limit
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 })
    }

    const rateLimit = await validateAndLimitApiKey(authHeader)
    if (!rateLimit.success) {
      return NextResponse.json({ error: rateLimit.message }, { status: 429 })
    }

    // Parse request
    const body = await request.json()

    // Call your tool
    const result = await myToolLogic(body)

    // Return with rate limit info
    return NextResponse.json({
      tool: 'my-tool',
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

---

## Testing Scenarios

### Test Signup/Login Flow

1. Open http://localhost:3000/auth
2. Sign up with a new account
3. Check Supabase → `users_profile` table for your user
4. Logout and sign back in
5. Should land on dashboard

### Test API Key Creation

1. From dashboard, click "Create New Key"
2. Enter label "Test Key"
3. Save the key
4. It should appear in the table below

### Test Rate Limiting

```bash
API_KEY="pk_your_key"

# This script will test rate limiting
for i in {1..250}; do
  echo "Request $i"
  curl -X POST http://localhost:3000/api/tools/example \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"input": "test"}' \
    -s | grep -o '"error":"[^"]*"' || echo "Success"
done

# After 200 requests, you should see: "Rate limit exceeded"
```

### Test Pro Upgrade

1. From dashboard, click "Upgrade to Pro" button
2. You'll be redirected to Stripe checkout
3. Use test card: `4242 4242 4242 4242`
4. Enter any future date and any 3-digit CVC
5. After payment, check your user's plan in Supabase
6. Should be changed to `plan: 'pro'` and `rate_limit: 2000`

---

## Deployment to Vercel

Once everything works locally:

```bash
# 1. Push code to GitHub
git add .
git commit -m "Add auth and API system"
git push origin main

# 2. Go to vercel.com
# - Import your repository
# - Add all environment variables from .env.local
# - Deploy

# 3. Update Stripe webhook URL to your Vercel domain
```

See `SETUP_GUIDE.md` for detailed Vercel instructions.

---

## Troubleshooting

### "Relation users_profile does not exist"

**Cause:** You haven't run the database migrations yet.

**Fix:** Run the SQL from `supabase/migrations/001_create_users_profile.sql` in Supabase dashboard.

### "Invalid API Key" when calling API

**Cause:** The key doesn't exist or belongs to a different user.

**Fix:**
1. Create a new key in dashboard
2. Make sure you're using the exact key returned
3. Check format is: `Authorization: Bearer pk_xxx`

### "Rate limit exceeded" immediately

**Cause:** Upstash Redis not configured or unreachable.

**Fix:**
1. Check `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in env
2. Make sure tokens are correct
3. If stuck, you can disable rate limiting temporarily (not recommended for production)

### Stripe webhook not triggering

**Cause:** Webhook URL wrong or signing secret doesn't match.

**Fix:**
1. Check webhook URL in Stripe dashboard matches your domain
2. For local testing, use `stripe listen` to forward webhooks
3. Make sure `STRIPE_WEBHOOK_SECRET` is set correctly
4. Check Stripe dashboard → Webhooks → Recent events

### Can't sign up - auth.users table error

**Cause:** Supabase Auth not properly configured.

**Fix:**
1. Go to Supabase dashboard
2. Go to **Authentication** → **Settings**
3. Under "Email auth," make sure it's **enabled**
4. Restart your dev server

---

## File Structure Overview

```
app/
├── auth/
│   └── page.tsx                    # Login/Signup form
├── dashboard/
│   └── page.tsx                    # User dashboard with key management
├── api/
│   ├── account/
│   │   └── api-keys/
│   │       ├── route.ts            # POST (create), GET (list)
│   │       └── [keyId]/
│   │           └── route.ts        # DELETE key
│   ├── stripe/
│   │   ├── checkout/
│   │   │   └── route.ts            # Create checkout session
│   │   └── webhook/
│   │       └── route.ts            # Handle Stripe events
│   └── tools/
│       ├── example/
│       │   └── route.ts            # Example endpoint
│       └── [add more tools here]
├── context/
│   └── AuthContext.tsx             # Auth state + hooks
├── components/
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   ├── Dashboard.tsx
│   └── ... (existing components)
├── tools/
│   └── ... (existing tool UIs)
├── layout.tsx
├── page.tsx
├── providers.tsx
└── globals.css

lib/
├── supabaseClient.ts               # Public Supabase client
├── supabaseAdmin.ts                # Admin Supabase client
├── stripe.ts                       # Stripe helpers
├── tools/
│   ├── case-converter.ts
│   ├── word-counter.ts
���   └── ... (existing tool logic)
└── middleware/
    └── rateLimit.ts                # Rate limiting logic

supabase/
└── migrations/
    └── 001_create_users_profile.sql # Database schema

docs/
├── SETUP_GUIDE.md                  # Complete setup instructions
├── API_DOCUMENTATION.md            # API reference
└── NEXT_STEPS.md                   # This file
```

---

## Summary Checklist

- [ ] Run Supabase migrations (create tables)
- [ ] Test sign up/login at /auth
- [ ] Create API key in dashboard
- [ ] Test API endpoint with key
- [ ] Create Stripe product and price
- [ ] Add STRIPE_PRO_PRICE_ID to env
- [ ] Set up Stripe webhook locally with `stripe listen`
- [ ] Add STRIPE_WEBHOOK_SECRET to env
- [ ] Test "Upgrade to Pro" button
- [ ] Verify user upgrades to Pro in Supabase
- [ ] Test rate limiting (200 req/min for free, 2000 for pro)
- [ ] Deploy to Vercel
- [ ] Update Stripe webhook URL to Vercel domain
- [ ] Test full flow in production

---

## Next Resources

- 📖 **Setup Guide:** See `SETUP_GUIDE.md` for detailed setup instructions
- 📚 **API Docs:** See `API_DOCUMENTATION.md` for complete API reference
- 🚀 **Supabase Docs:** https://supabase.com/docs
- 💳 **Stripe Docs:** https://stripe.com/docs
- ⚡ **Vercel Docs:** https://vercel.com/docs
- 🔗 **Upstash Docs:** https://upstash.com/docs

---

## Questions?

The system is fully scaffolded and ready. All pieces are in place, you just need to:

1. **Create the database** (run migrations)
2. **Configure Stripe** (create product and webhook)
3. **Test locally** (sign up, create keys, test API)
4. **Deploy to Vercel** (push to GitHub)

Let me know if you hit any issues!
