# Sub-Penny Aggregation System

## Overview

The sub-penny aggregation system solves payment processing errors that occur when trying to charge fractional penny amounts (less than 1 cent). Payment processors like Stripe require all charges to be whole cents, so this system automatically aggregates fractional costs until they reach 1 cent, then deducts them in bulk.

## How It Works

### Flow

1. **API Call Made**: User makes an API call to a tool that costs, for example, 0.2 cents ($0.002)
2. **Fractional Cost Check**: The system detects this is less than 1 cent
3. **Accumulation**: The 0.2 cents is added to the user's `pending_fractional_cents` field (0.2)
4. **No Immediate Charge**: No balance deduction happens
5. **Next Call**: User makes another call to the same tool (0.2 cents)
6. **Total Pending**: 0.2 + 0.2 = 0.4 cents pending
7. **Still Accumulating**: Still < 1 cent, so no deduction
8. **Another Call**: User makes a 3rd call (0.2 cents)
9. **Threshold Reached**: 0.4 + 0.2 = 0.6 cents, but still < 1 cent
10. **Final Call**: User makes a 4th call (0.2 cents)
11. **Deduction Triggered**: 0.6 + 0.2 = 0.8 cents → floor(0.8) = 0 cents to deduct (still pending)
12. **5th Call**: 0.8 + 0.2 = 1.0 cents → floor(1.0) = 1 cent to deduct ✓
13. **Charge Applied**: 1 cent is deducted from user's balance
14. **Remaining**: 1.0 - 1.0 = 0 cents pending for next time

### Example Scenario

```
Call 1: cost=0.2¢, pending=0.2¢  → no deduction
Call 2: cost=0.2¢, pending=0.4¢  → no deduction
Call 3: cost=0.2¢, pending=0.6¢  → no deduction
Call 4: cost=0.2¢, pending=0.8¢  → no deduction
Call 5: cost=0.2¢, pending=1.0¢  → deduct 1¢, pending=0.0¢
Call 6: cost=0.2¢, pending=0.2¢  → no deduction
Call 7: cost=0.2¢, pending=0.4¢  → no deduction
```

After 5 calls on a 0.2¢ tool, exactly 1¢ is deducted (meeting minimum charge requirement).

## Implementation Details

### Database Schema

**New Column**: `pending_fractional_cents` (NUMERIC(5,2))
- Stores fractional costs accumulated but not yet deducted
- Default: 0.0
- Range: 0.00 to 99.99 (stored with 2 decimal places for precision)
- Persisted per user for accurate multi-session tracking

**Migration**: `003_add_fractional_cents_aggregation.sql`

### Rate Limiting Middleware

Located in: `/lib/middleware/rateLimit.ts`

Key changes:
1. Fetches `pending_fractional_cents` from user profile
2. Calculates: `totalPending = pending_fractional_cents + toolCost`
3. Extracts: `centsToDeduct = floor(totalPending)`
4. Calculates remainder: `remainingFractional = totalPending - centsToDeduct`
5. Updates `pending_fractional_cents` with remainder
6. Only calls `record_transaction()` if `centsToDeduct > 0`
7. Uses `centsToDeduct` for balance checks and auto-recharge triggers

### Pricing Configuration

Located in: `/config/pricing.config.ts`

Tool costs now support fractional values:
```typescript
TOOL_COSTS: {
  'case-converter': 0.2,      // 0.2¢ (sub-penny, aggregated)
  'word-counter': 0.2,         // 0.2¢ (sub-penny, aggregated)
  'json-formatter': 0.1,       // 0.1¢ (sub-penny, aggregated)
  'blog-generator': 50,        // 50¢ (charged immediately)
}
```

Helper functions:
- `formatCost(costInCents)` - Format cents to dollar string
- `formatCostWithAggregation(costInCents)` - Format with "(aggregated)" note if sub-penny
- `isSubPennyCost(costInCents)` - Check if cost < 1 cent

## Benefits

✅ **Supports Cheap Tools**: Can price tools at 0.1¢, 0.25¢, 0.5¢, etc.
✅ **No Payment Errors**: All deductions are whole cents
✅ **Accurate Billing**: Users eventually pay exactly what they use
✅ **Per-User Pending**: Each user's pending costs tracked separately
✅ **Transparent**: Clear in logs when aggregation happens
✅ **No User Impact**: Transparent aggregation, users don't need to do anything

## Example Use Cases

### Case 1: Very Cheap Tool (0.1¢)
```
Tool cost: 0.1¢
After 10 calls: 1¢ deducted
User's actual cost: exactly 0.1¢ per call
```

### Case 2: Multiple Cheap Tools (0.1¢ and 0.2¢)
```
Call tool A (0.1¢): pending = 0.1¢
Call tool B (0.2¢): pending = 0.3¢
Call tool A (0.1¢): pending = 0.4¢
Call tool A (0.1¢): pending = 0.5¢
Call tool B (0.2¢): pending = 0.7¢
Call tool A (0.1¢): pending = 0.8¢
Call tool A (0.1¢): pending = 0.9¢
Call tool A (0.1¢): pending = 1.0¢ → 1¢ deducted
```

### Case 3: Mix of Cheap and Expensive (0.2¢ and 50¢)
```
Call tool A (0.2¢): pending = 0.2¢ (aggregated)
Call tool B (50¢):  pending = 0.2¢, deduct 50¢ immediately
Call tool A (0.2¢): pending = 0.4¢ (aggregated)
```

## Viewing Pending Costs

Users can see their pending fractional costs via API:

```javascript
// GET /api/account/profile
{
  "balance": 10000,  // cents
  "pending_fractional_cents": 0.3,  // fractional cents waiting
  ...
}
```

Or in the dashboard (if UI implemented):
```
Current Balance: $100.00
Pending Usage: $0.003 (will be deducted when reaching $0.01)
```

## Admin / Configuration

To change pricing to support sub-penny costs:

1. Edit `/config/pricing.config.ts`
2. Update TOOL_COSTS with fractional values
3. Example:
   ```typescript
   TOOL_COSTS: {
     'my-tool': 0.5,  // 0.5¢ per call
   }
   ```
4. No database migration needed (schema already supports it)
5. Changes take effect immediately on server restart

## Edge Cases & Considerations

### Case: User Has Pending, Account Deleted
- Pending fractional costs are lost (acceptable, it's < 1¢)

### Case: Monthly Reset
- `pending_fractional_cents` persists across monthly resets
- It's not part of `usage_this_month` until actually deducted
- This ensures fair billing (fractional costs eventually become whole cents)

### Case: User Withdraws Balance / Refund
- `pending_fractional_cents` should be zeroed if refunding all money
- Should be preserved if partial refund (fair to user)

### Case: Auto-Recharge Trigger
- Auto-recharge checks against actual deducted amount (`centsToDeduct`)
- Not against the full cost including pending
- Ensures fair balance checking

## Testing

### Test Case 1: Verify Aggregation
```bash
# Create tool with 0.2¢ cost
# Make 5 API calls
# Check: 
#   - First 4 calls: no balance change
#   - 5th call: 1¢ deducted
#   - pending_fractional_cents: 0.0
```

### Test Case 2: Verify Remainder
```bash
# Create tool with 0.35¢ cost
# Make 3 calls (0.35 + 0.35 + 0.35 = 1.05)
# Check:
#   - After 3rd call: 1¢ deducted
#   - pending_fractional_cents: 0.05
```

### Test Case 3: Verify Monthly Limits
```bash
# Set monthly limit: $1.00 (10000¢)
# Create tool with 0.2¢ cost
# Make 50000 calls (50000 * 0.2 = 10000¢ exactly)
# Check: Succeeds, balance becomes 0
# Make 1 more call: Should fail with "limit reached"
```

## Future Enhancements

1. **Dashboard UI** - Show pending fractional costs to users
2. **Notifications** - Alert when pending accumulated to 1¢+ and about to be deducted
3. **Analytics** - Track which tools use sub-penny pricing most
4. **Batch API** - Option to pre-aggregate calls before sending (client-side)
5. **Crypto Integration** - For sub-penny billing with high precision
