# Tools Hub - System Architecture

Complete overview of the authentication, API key management, billing, and rate limiting system.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   /auth      │  │  /dashboard  │  │   /tools     │          │
│  │  Login/Signup│  │ Key Mgmt UI  │  │  Tool Pages  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                  │                  │                 │
│         └──────────────────┴──────────────────┘                 │
│                       │                                          │
│                 AuthContext                                      │
│             (useAuth hook)                                       │
│                       │                                          │
└───────────────────────┼──────────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
┌───────▼──────────────┐     ┌──────────▼───────��──────┐
│   Supabase Auth      │     │  Supabase Database      │
│  (email/password)    │     │  - users_profile        │
│                      │     │  - api_keys             │
└──────────────────────┘     └─────────────────────────┘
                        
┌────────────────────────────────────────────────────────────────┐
│                    Backend (Next.js API Routes)                │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ /api/tools/[tool]/route.ts                             │  │
│  │ • Validate API key from Authorization header           │  │
│  │ • Check rate limit (Redis)                             │  │
│  │ • Call tool logic                                      │  │
│  │ • Return result + remaining requests                  │  │
│  └─────────────────────���───────────────────────────────────┘  │
│                          │                                     │
│                          ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Rate Limit Middleware (/lib/middleware/rateLimit.ts)   │  │
│  │ • Extract API key from header                          │  │
│  │ • Query Supabase for key → user_id                     │  │
│  │ • Query Supabase for user plan & rate_limit            │  │
│  │ • Check Redis for request count this minute            │  │
│  │ • Increment counter in Redis (60s TTL)                 │  │
│  │ • Update last_used timestamp                           │  │
│  │ • Return remaining requests                            │  │
│  └─────────────────────────────────────────────────────────┘  │
│                          │                                     │
│            ┌─────────────┼─��───────────┐                       │
│            ▼             ▼             ▼                       │
│    ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│    │ Supabase   │ │   Redis    │ │   Tool     │               │
│    │ Database   │ │ (Upstash)  │ │   Logic    │               │
│    └────────────┘ └────────────┘ └────────────┘               │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Billing Routes                                          │  │
│  │ • /api/stripe/checkout - Create checkout session       │  │
│  │ • /api/stripe/webhook - Handle payment success/fail    │  │
│  │ Updates user plan in Supabase                          │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Account Management Routes                               │  │
│  │ • /api/account/api-keys - List, create, delete keys    │  │
│  │ Requires Supabase Auth session                         │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
    ┌────────────┐      ┌────────────┐    ┌──────────┐
    │ Supabase   │      │   Stripe   │    │ Upstash  │
    │ PostgreSQL │      │  (Billing) │    │  (Redis) │
    └────────────┘      └────────────┘    └──────────┘
```

## Database Schema

### users_profile Table

Stores user account information and plan details.

```sql
CREATE TABLE users_profile (
  id UUID PRIMARY KEY,                    -- auth.users(id)
  plan TEXT (free | pro),                 -- Current plan
  rate_limit INTEGER,                     -- Requests/minute (200|2000)
  stripe_customer_id TEXT,                -- Stripe customer ID
  created_at TIMESTAMP,                   -- Account creation date
  updated_at TIMESTAMP                    -- Last update
)
```

**Row Level Security:**
- Users can only view/update their own profile

**Auto-Trigger:**
- New profile created when user signs up with plan='free', rate_limit=200

### api_keys Table

Stores API keys for accessing the API.

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY,                    -- Key ID
  user_id UUID,                           -- users_profile(id)
  key TEXT UNIQUE,                        -- The actual key (pk_xxx)
  label TEXT,                             -- User-friendly name
  last_used TIMESTAMP,                    -- Last API call time
  created_at TIMESTAMP                    -- Key creation date
)
```

**Row Level Security:**
- Users can only view/delete their own keys
- Users can create new keys

**Indexes:**
- `user_id` - Fast lookup by user
- `key` - Fast lookup by API key

## Authentication Flow

```
User → /auth page
        │
        ├─ Sign Up
        │    └─ email + password
        │         │
        │         ▼
        │    Supabase Auth
        │    Creates auth.user
        │         │
        │         ▼
        │    Trigger: create_user_profile()
        │    Inserts users_profile record
        │    (plan='free', rate_limit=200)
        │         │
        │         ▼
        │    User signed in
        │    Redirect to /dashboard
        │
        └─ Sign In
             └─ email + password
                  │
                  ▼
             Supabase Auth
             Validates credentials
                  │
                  ▼
             Session created
             Redirect to /dashboard
```

## API Key Management Flow

```
User at /dashboard
    │
    ├─ Click "Create New Key"
    │    │
    │    ├─ Enter label (e.g., "Production")
    │    │
    │    └─ POST /api/account/api-keys
    │         ├─ Check auth session
    │         ├─ Generate random key (pk_xxx)
    │         ├─ Insert into api_keys table
    │         └─ Return key to user (only time visible)
    │
    ├─ View API Keys
    │    │
    │    └─ GET /api/account/api-keys
    │         ├─ Check auth session
    │         ├─ Query api_keys WHERE user_id = current_user
    │         └─ Return list (without full key, masked)
    │
    └─ Delete API Key
         │
         └─ DELETE /api/account/api-keys/{keyId}
              ├─ Check auth session
              ├─ Verify key belongs to user
              └─ Delete from database
```

## API Request Flow

```
Client (with API key)
    │
    └─ POST /api/tools/[tool]
        ├─ Authorization: Bearer pk_abc123...
        │
        ├─ Middleware: validateAndLimitApiKey()
        │    ├─ Extract key from header
        │    ├─ Query: api_keys WHERE key = 'pk_abc123'
        │    │    └─ Find user_id
        │    │
        │    ├─ Query: users_profile WHERE id = user_id
        │    │    └─ Get plan & rate_limit
        │    │
        │    ├─ Check Redis: GET ratelimit:keyId:minute
        │    │    └─ Get current request count
        │    │
        │    ├─ Compare count with rate_limit
        │    │    └─ If count > limit → Return 429
        │    │    └─ If count ≤ limit → Proceed
        │    │
        │    ├─ Increment Redis: INCR ratelimit:keyId:minute
        │    ├─ Set TTL: EXPIRE 60 seconds
        │    │
        │    └─ Update last_used on api_keys
        │
        └─ Tool Endpoint
             ├─ Process request
             ├─ Return result + rateLimit info
             └─ {
                  tool: "case-converter",
                  result: { ... },
                  rateLimit: {
                    remaining: 195,
                    resetTime: 1234567890
                  }
                }
```

## Rate Limiting Details

**Per-minute limits:**
- Free plan: 200 requests/minute
- Pro plan: 2000 requests/minute

**Implementation:**
- Redis key format: `ratelimit:{keyId}:{unixMinute}`
- Each key incremented with INCR command
- TTL set to 60 seconds
- When TTL expires, counter resets

**Example:**
```
Minute 1: 0-59 seconds
  Key: ratelimit:uuid:1234567800
  Requests: 1, 2, 3, ... 200
  
Minute 2: 60-119 seconds (new minute starts)
  Old key expires, Redis auto-deletes it
  New key: ratelimit:uuid:1234567860
  Requests: 1, 2, 3, ...
```

## Billing Flow

```
User at /dashboard
    │
    ├─ Click "Upgrade to Pro"
    │    │
    │    └─ POST /api/stripe/checkout
    │         ├─ Check auth session
    │         ├─ Get Stripe customer ID (or create new)
    │         ├─ Create checkout session
    │         │   (line_items: [pro plan price])
    │         └─ Return Stripe session URL
    │
    └─ Redirect to Stripe Checkout
         │
         ├─ Enter card details
         ├─ Complete payment
         │
         └─ Stripe triggers webhook
              │
              └─ POST /api/stripe/webhook
                   ├─ Verify webhook signature
                   ├─ Check event type:
                   │
                   ├─ customer.subscription.created/updated
                   │    └─ UPDATE users_profile
                   │        SET plan='pro', rate_limit=2000
                   │
                   ├─ customer.subscription.deleted
                   │    └─ UPDATE users_profile
                   │        SET plan='free', rate_limit=200
                   │
                   └─ Return 200 OK to Stripe
```

## Component Architecture

### Frontend Components

```
App Layout
├── AuthProvider (context)
│   └── RootProvider
│       ├── Header
│       │   └── Theme toggle
│       ├── Sidebar
│       │   ├── Tools list
│       │   ├── Search
│       │   └── Favorites
│       ├── Main Content
│       │   ├── Dashboard (default)
│       │   │   ├── Appearance
│       │   │   ├── Quick Start
│       │   │   └── About
│       │   └── Tool Pages (on selection)
│       │       ├── case-converter
│       │       ├── word-counter
│       │       ├── hex-rgba-converter
│       │       ├── image-resizer
│       │       ├── og-generator
│       │       └── blog-generator
│       └── API Preview (when tool selected)
│           ├── Language selector (fetch/curl/axios/python)
│           └── Code display + copy button

Special Routes
├── /auth (outside RootProvider)
│   ├── Signup form
│   └── Login form
└── /dashboard (inside RootProvider)
    ├── Account info
    ├── API keys table
    └── Upgrade button
```

### API Route Structure

```
/api
├── /tools
│   ├── /[slug]
│   │   └── route.ts (tool endpoints)
│   └── /example
│       └── route.ts (example endpoint)
├── /account
│   └── /api-keys
│       ├���─ route.ts (GET list, POST create)
│       └── /[keyId]
│           └── route.ts (DELETE)
└── /stripe
    ├── /checkout
    │   └── route.ts (POST)
    └── /webhook
        └── route.ts (POST)
```

## Security Considerations

### API Key Security

- Keys generated with cryptographically secure random (32 hex chars)
- Keys prefixed with `pk_` for easy identification
- Keys hashed in database (not stored plaintext) - TODO: implement hashing
- Keys only shown once to user (on creation)
- Last used timestamp tracks activity
- Keys tied to user account via user_id FK

### Rate Limiting Security

- Per-user limits (not per-IP) prevent spoofing
- Redis TTL prevents memory bloat
- User plan determines limit (prevents free users abusing)
- Key validation required before checking limit

### Authentication Security

- Password hashing handled by Supabase Auth
- Session tokens used (not passwords) in cookies
- RLS policies ensure users see only their data
- Service role key (with caution) only used server-side

### Stripe Security

- Webhook signatures verified with signing secret
- Customer metadata immutable after creation
- Subscription events drive plan updates
- Price IDs configured (no hardcoded costs)

## Deployment Architecture

### Vercel (Frontend + API Routes)

```
Vercel Edge Network
│
└─ Next.js Application (Serverless Functions)
    ├─ Pages & Components
    ├─ API Routes (Node.js)
    │   ├─ Talk to Supabase
    │   ├─ Call Stripe API
    │   └─ Query Redis
    └─ Environment Variables
        ├── NEXT_PUBLIC_SUPABASE_URL
        ├── STRIPE_SECRET_KEY
        └── UPSTASH_REDIS_*
```

### External Services

```
Supabase (PostgreSQL)
├── Authentication
├── users_profile table
└── api_keys table

Stripe (Payment Processing)
├── Customer management
├── Subscription management
└── Webhook events

Upstash (Redis)
└── Rate limit counters
```

## Scalability Considerations

### Database
- RLS policies prevent N+1 queries
- Indexes on frequently queried columns (user_id, key)
- Single row operations (no complex joins)

### Rate Limiting
- Redis key-value lookup is O(1)
- No relational queries during rate check
- TTL auto-cleanup prevents memory growth
- Per-minute rolling window (simple & fast)

### API Routes
- Stateless functions (scale horizontally)
- Minimal Supabase queries per request
- Single Redis call per request
- Connection pooling via Supabase

### Bottlenecks to Watch
1. **Supabase connection limit** - Use connection pooling
2. **Redis throughput** - Monitor in Upstash dashboard
3. **Stripe API rate limit** - Usually not an issue for checkout
4. **Vercel function timeout** - 60s max, most calls should be <1s

## Monitoring & Observability

### What to Monitor

1. **API Response Times**
   - Goal: <200ms per request
   - Track in your analytics

2. **Rate Limit Hit Rate**
   - Monitor how often users hit limits
   - Consider adjusting limits if high

3. **Error Rates**
   - Track 401 (invalid key) errors
   - Track 429 (rate limit) errors
   - Track 500 (server) errors

4. **Key Usage Patterns**
   - `last_used` timestamps show active keys
   - Delete old unused keys for security

5. **Billing Success Rate**
   - Monitor webhook events in Stripe
   - Ensure payment → pro upgrade works

### Log Locations

- **Vercel:** Vercel Dashboard → Deployments → Logs
- **Supabase:** Supabase Dashboard → Logs
- **Stripe:** Stripe Dashboard → Webhooks → Event Logs
- **Upstash:** https://console.upstash.com → Logs

## Summary

This system provides:

✅ **User Authentication** - Email/password via Supabase Auth
✅ **API Key Management** - Create, view, delete keys
✅ **Rate Limiting** - Per-user limits based on plan
✅ **Billing Integration** - Stripe checkout + webhooks
✅ **Scalable Architecture** - Serverless functions + managed databases
✅ **Security** - RLS, API key validation, webhook verification
✅ **Developer Experience** - Clear API, good documentation, example endpoints

Ready to scale to thousands of users! 🚀
