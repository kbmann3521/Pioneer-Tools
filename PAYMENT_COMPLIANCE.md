# Payment Method Storage & Legal Compliance

## Executive Summary

This application uses **Stripe** for all payment processing. We **NEVER store raw credit card data**—Stripe handles all card data storage under PCI-DSS Level 1 compliance. We only store Stripe tokens (Payment Method IDs) in our database.

---

## How Payment Methods Are Stored

### What We Store
```
users_profile table:
- default_payment_method_id (TEXT) → Stripe Payment Method ID (e.g., "pm_1234567890")
- stripe_customer_id (TEXT) → Stripe Customer ID (e.g., "cus_1234567890")
```

### What We DON'T Store
- ❌ Credit card numbers
- ❌ CVV/CVC security codes
- ❌ Expiration dates
- ❌ Cardholder names
- ❌ Card full track data

### How It Works

1. **User adds funds via checkout**
   - Browser → Stripe Checkout Form (hosted by Stripe)
   - Stripe processes card directly (we never see raw card data)
   - Stripe returns a Payment Method ID to our webhook

2. **Payment Method ID stored**
   ```typescript
   // Webhook receives Stripe session completed event
   const paymentMethodId = await stripe.paymentIntents.retrieve(session.payment_intent)
   
   // Store only the ID in our database
   await supabaseAdmin
     .from('users_profile')
     .update({ default_payment_method_id: paymentMethodId })
     .eq('id', userId)
   ```

3. **Auto-recharge uses stored ID**
   ```typescript
   // When balance drops below threshold:
   const paymentIntent = await stripe.paymentIntents.create({
     amount: rechargeAmount,
     currency: 'usd',
     customer: stripeCustomerId,
     payment_method: defaultPaymentMethodId, // Only the ID, not card data
     off_session: true, // Indicates recurring/auto charge
     confirm: true,
   })
   ```

---

## Security & Compliance Standards

### PCI-DSS (Payment Card Industry Data Security Standard)

**What is it?** Standard for securely handling credit card data.

**Our Implementation:**
- ✅ **Level 1 Compliance** → Achieved through Stripe (they handle it)
- ✅ No raw card data touches our servers
- ✅ All card transmission over HTTPS
- ✅ Stripe uses tokenization (Payment Method IDs are not sensitive)
- ✅ No card data in logs or backups

**Why this matters:** If we stored card numbers, we'd need expensive security audits, penetration testing, and extensive infrastructure. By using Stripe, we offload this to PCI-DSS Level 1 certified experts.

### GDPR (General Data Protection Regulation)

**What is it?** EU law regulating personal data handling.

**Our Implementation:**
- ✅ **Explicit Consent**: Users must enable auto-recharge in dashboard (checkbox)
- ✅ **Right to Erasure**: When user deletes account, all payment methods are deleted
- ✅ **Data Minimization**: Only storing IDs, not full card details
- ✅ **Transparency**: Dashboard clearly shows when auto-recharge is enabled and amount
- ✅ **Audit Trail**: All charges logged in `billing_transactions` table

**User Controls:**
```typescript
// Users can:
1. Enable/disable auto-recharge at any time
2. Change recharge threshold and amount
3. View all charges in Recent Activity
4. Delete account (triggers cascade delete of payment methods)
```

### Fair Billing & Consumer Protection Laws

**What is it?** Laws preventing unauthorized charges (varies by country/state).

**Our Implementation:**

1. **Clear Disclosure**
   - Dashboard shows: "Enable auto-recharge when balance drops below threshold"
   - Threshold and amount clearly displayed before enabling
   - Confirmation dialog before any auto-recharge settings

2. **Easy Cancellation**
   - Users can disable auto-recharge with one click
   - No cancellation forms or waiting periods
   - Immediate effect

3. **Transparent Charges**
   - Every charge logged in "Recent Activity"
   - Dashboard shows: transaction type, amount, date, description
   - Users can export transaction history

4. **Refund Policy**
   - Auto-recharge failures logged (no charge if card declined)
   - Users notified if payment method needs update
   - Refunds handled through dashboard or support

### CCPA (California Consumer Privacy Act)

**What is it?** California law giving consumers control over personal data.

**Our Implementation:**
- ✅ **Data Access**: Users can request their payment transaction history
- ✅ **Data Deletion**: Payment methods deleted when account is removed
- ✅ **No Selling**: We never sell payment method data to third parties
- ✅ **Opt-out**: Users can disable auto-recharge anytime

---

## Fraud & Security Measures

### Stripe's Built-in Protections
- 3D Secure authentication (for high-risk transactions)
- Real-time fraud detection
- Card velocity checks
- Address Verification System (AVS)

### Our Application Layer
```typescript
// Rate limiting prevents automated abuse
validateAndLimitApiKey(authorization, toolId)
  ↓
  Check: 1 request per second (PAID users)
  ↓
  Check: User has balance + monthly spending limit
  ↓
  Charge card if below auto-recharge threshold
  ↓
  Only charge if payment method exists

// Transaction logging
billing_transactions table tracks:
- User ID (who)
- Amount (how much)
- Type (charge/deposit/auto_recharge)
- Timestamp (when)
- Description (why)
- Stripe Intent ID (Stripe reference)
```

### Failed Charge Handling
```typescript
// If auto-recharge fails:
1. Exception caught and logged
2. failed_auto_recharge_count incremented
3. Transaction recorded with error message
4. User's balance NOT updated
5. Next API call triggers retry (if still below threshold)
6. After 3 failures → Email user about payment method update
```

---

## Data Retention & Deletion

### What's Kept
- **Stripe**: Stores payment methods indefinitely (user can delete via Stripe dashboard)
- **Our DB**: Payment method IDs kept for active auto-recharge
- **Audit Trail**: Transaction history kept for 7 years (tax/legal reasons)

### What's Deleted
```typescript
// When user deletes account:
1. Auth user deleted from Supabase auth
2. Trigger cascade deletes:
   - users_profile (including payment method ID)
   - api_keys
   - billing_transactions
3. Stripe: Customer soft-deleted (kept for refund audit)
```

---

## Webhook Security

### Signature Verification
```typescript
// Every webhook verified with STRIPE_WEBHOOK_SECRET
const event = stripe.webhooks.constructEvent(
  body,
  signature, // From Stripe-Signature header
  webhookSecret // From .env (never logged)
)

// Only process if signature valid
// Prevents spoofed/replayed webhooks
```

### Webhook Audit Trail
```
All events logged in database:
✅ checkout.session.completed → Payment succeeded, method stored
✅ charge.succeeded → Fund confirmed
✅ charge.failed → Failure logged, user notified
```

---

## Best Practices Implemented

| Practice | Status | Details |
|----------|--------|---------|
| No card data storage | ✅ | Using Stripe Payment Method IDs |
| HTTPS only | ✅ | All payments via HTTPS |
| Webhook verification | ✅ | Stripe signature validation |
| Explicit consent | ✅ | Users must enable auto-recharge |
| Easy cancellation | ✅ | One-click disable |
| Transaction logging | ✅ | Audit trail in database |
| Error handling | ✅ | Failed charges logged, not retried immediately |
| Rate limiting | ✅ | Prevents abuse and excessive charges |
| Environment secrets | ✅ | API keys in .env, never in code |

---

## Legal Disclaimers

### For Implementation
This code implements standard payment security practices but is **NOT a substitute for legal review**. Before going to production, consult with:
- Legal team (payment & consumer protection laws for your jurisdiction)
- Security team (PCI-DSS audit)
- Stripe's compliance team (for specific questions)

### For Your Terms of Service
Your app should include:
```
1. Clear disclosure of auto-recharge terms
2. How to enable/disable auto-recharge
3. Refund policy
4. Data retention policy
5. Privacy policy (mentioning Stripe)
6. Dispute resolution process
```

### Example T&C Clause
```
"Auto-Recharge: When your account balance falls below your 
configured threshold, we will automatically charge your saved 
payment method to add funds. You can enable/disable this feature 
in Dashboard > Auto-Recharge Settings at any time. Charges appear 
in your transaction history within 24 hours."
```

---

## Testing Payment Methods (Sandbox)

### Test Cards
```
✅ Success:  4242 4242 4242 4242
❌ Decline: 4000 0000 0000 0002
⚠️ Auth:    4000 0025 0000 3155 (requires 3D Secure)
```

### Testing Auto-Recharge
1. Add funds with test card 4242 4242 4242 4242
2. Enable auto-recharge (threshold: $2.00)
3. Make API calls to drop balance below $2.00
4. System automatically charges card
5. View transaction in Recent Activity

---

## Production Checklist

Before deploying auto-recharge to production:

- [ ] Run migration 003_add_payment_method.sql in Supabase
- [ ] Review and update Terms of Service
- [ ] Test auto-recharge with real cards (in Stripe test mode)
- [ ] Set up email notifications for failed charges
- [ ] Configure Stripe dashboard webhook for production
- [ ] Test refund process
- [ ] Document your refund/dispute policy
- [ ] Set up logging/monitoring for failed charges
- [ ] Train support team on payment issues
- [ ] Review CCPA/GDPR compliance for your region
- [ ] Consider insurance (e.g., cyber liability) if handling payments at scale

---

## Troubleshooting

### Payment Method Not Saved
```
Issue: User completed checkout but auto-recharge shows no method on file
Fix: Check webhook logs - ensure checkout.session.completed event processed
```

### Auto-Recharge Not Triggering
```
Issue: Balance dropped below threshold but didn't auto-recharge
Fix: Check if:
  1. Auto-recharge enabled in dashboard
  2. Payment method stored (default_payment_method_id not null)
  3. Stripe customer created (stripe_customer_id not null)
  4. Check failed_auto_recharge_count (might be blocked after failures)
```

### Stripe Webhook Not Received
```
Issue: Payments processed but balance not updated
Fix: 
  1. Verify webhook configured in Stripe dashboard
  2. Check webhook signing secret in .env
  3. Review webhook delivery logs in Stripe dashboard
  4. Ensure API route /api/stripe/webhook is accessible
```

---

## References

- [Stripe Payment Methods Documentation](https://stripe.com/docs/payments/payment-methods)
- [PCI-DSS Compliance](https://www.pcisecuritystandards.org/)
- [GDPR Overview](https://gdpr.eu/)
- [CCPA Consumer Rights](https://oag.ca.gov/privacy/ccpa)
- [US Fair Credit Billing Act](https://www.ftc.gov/business-guidance/resources/fair-credit-billing-act)

---

**Last Updated**: 2025-11-08  
**Maintained By**: Your Development Team  
**Review Schedule**: Annually or when payment regulations change
