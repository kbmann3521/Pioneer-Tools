/**
 * Pricing Configuration
 *
 * Edit this file to change:
 * - Cost per API call for each tool (supports sub-penny fractional costs)
 * - Free vs Paid tier rate limits
 * - Minimum deposit amount
 *
 * SUB-PENNY AGGREGATION SYSTEM:
 * To avoid payment processing errors with costs < 1 cent, sub-penny charges
 * are automatically aggregated. When a user makes an API call with a cost
 * < 1 cent, that fractional amount is stored and combined with future calls.
 * Only when the accumulated pending cost >= 1 cent is it deducted from the user's balance.
 * This ensures all charges are whole cents (minimum charge unit for payment processors).
 *
 * All changes automatically reflect in the API preview sidebar and dashboard
 */

export const PRICING = {
  // Minimum amount required to fund account (in cents, so 1000 = $10.00)
  MINIMUM_DEPOSIT: 1000,

  // Cost per API call in cents (can be fractional for sub-penny costs)
  // Examples: 0.5 = $0.005, 0.25 = $0.0025, 2 = $0.002
  // Sub-penny costs are aggregated and only deducted when total >= 1 cent
  TOOL_COSTS: {
    'case-converter': 0.2, // $0.002 per call (aggregated)
    'word-counter': 0.2,
    'hex-rgba-converter': 0.2,
    'image-resizer': 0.5, // $0.005 - more expensive due to processing
    'og-generator': 0.3, // $0.003
    'blog-generator': 50, // $0.50 - AI powered, more expensive
    'json-formatter': 0.1, // $0.001
    'base64-converter': 0.1, // $0.001
    'url-encoder': 0.1, // $0.001
    'slug-generator': 0.1, // $0.001
    'password-generator': 0.1, // $0.001
    'image-average-color': 0.3, // $0.003 - image processing
    'image-color-extractor': 0.5, // $0.005 - multiple colors extraction
  } as Record<string, number>,
}

export const RATE_LIMITS = {
  FREE: {
    // Free users: 100 API calls per day
    dailyCallLimit: 100,
    // Max requests per second
    requestsPerSecond: 1,
    // Description for UI
    description: 'Free tier: 100 API calls/day, 1 req/sec',
    label: 'Free',
  },
  PAID: {
    // Paid users: unlimited API calls
    dailyCallLimit: null, // null = unlimited
    // Max requests per second (reasonable limit to prevent abuse)
    requestsPerSecond: 10,
    // Description for UI
    description: 'Paid tier: Unlimited API calls, 10 req/sec',
    label: 'Paid',
  },
}

/**
 * Get cost for a tool
 * @param toolId - The tool identifier (e.g., 'case-converter')
 * @returns Cost in cents (e.g., 2 = $0.002)
 */
export function getToolCost(toolId: string): number {
  return PRICING.TOOL_COSTS[toolId] || PRICING.TOOL_COSTS['case-converter']
}

/**
 * Format cost in cents to human-readable string
 * @param costInCents - Cost in cents
 * @returns Formatted string (e.g., "$0.002")
 */
export function formatCost(costInCents: number): string {
  return `$${(costInCents / 100).toFixed(3)}`
}

/**
 * Format balance in cents to human-readable string
 * @param balanceInCents - Balance in cents
 * @returns Formatted string (e.g., "$10.50")
 */
export function formatBalance(balanceInCents: number): string {
  return `$${(balanceInCents / 100).toFixed(2)}`
}

/**
 * Check if a cost is sub-penny (will be aggregated)
 * @param costInCents - Cost in cents (can be fractional)
 * @returns true if cost < 1 cent
 */
export function isSubPennyCost(costInCents: number): boolean {
  return costInCents < 1
}

/**
 * Format cost for display, indicating if it will be aggregated
 * @param costInCents - Cost in cents (can be fractional)
 * @returns Formatted string with aggregation note if sub-penny
 */
export function formatCostWithAggregation(costInCents: number): string {
  const formatted = formatCost(costInCents)
  if (isSubPennyCost(costInCents)) {
    return `${formatted} (aggregated)`
  }
  return formatted
}

/**
 * Check if user is free tier based on account type
 */
export function isFreeTier(userType: 'free' | 'paid'): boolean {
  return userType === 'free'
}

/**
 * Get rate limit config for user type
 */
export function getRateLimit(userType: 'free' | 'paid') {
  return userType === 'free' ? RATE_LIMITS.FREE : RATE_LIMITS.PAID
}
