/**
 * Rate limiting logic - handles per-second and daily rate limits
 * Separated from auth and billing concerns
 */

import { getRateLimit, RATE_LIMITS } from '@/config/pricing.config'

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

if (!UPSTASH_URL || !UPSTASH_TOKEN) {
  console.warn('Upstash Redis credentials not configured. Rate limiting partially disabled.')
}

interface RateLimitCheckResult {
  allowed: boolean
  errorType?: 'per-second' | 'daily'
  message?: string
  remainingDaily?: number
}

/**
 * Execute a command against Upstash Redis REST API
 */
async function redisCommand(command: string[]): Promise<any> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return null
  }

  try {
    const body = JSON.stringify(command)

    const response = await fetch(UPSTASH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Upstash error [${response.status}]: ${errorText}`)
      throw new Error(`Redis error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.result !== undefined ? data.result : data
  } catch (error) {
    console.error('Redis command error:', error)
    return null
  }
}

/**
 * Check per-second rate limit
 */
async function checkPerSecondLimit(
  keyId: string,
  maxPerSecond: number
): Promise<RateLimitCheckResult> {
  const now = Math.floor(Date.now() / 1000)
  const secondKey = `second:${keyId}:${Math.floor(now)}`

  const secondCount = await redisCommand(['GET', secondKey])
  const currentSecondCount = (secondCount ? parseInt(secondCount) : 0) + 1

  if (currentSecondCount > maxPerSecond) {
    return {
      allowed: false,
      errorType: 'per-second',
      message: `Rate limit exceeded. Max ${maxPerSecond} request(s) per second`,
    }
  }

  // Increment per-second counter (expires in 1 second)
  await redisCommand(['SETEX', secondKey, '1', currentSecondCount.toString()])

  return { allowed: true }
}

/**
 * Check daily rate limit (for free tier only)
 */
async function checkDailyLimit(
  keyId: string,
  maxPerDay: number
): Promise<RateLimitCheckResult> {
  const today = new Date().toISOString().split('T')[0]
  const dailyKey = `daily:${keyId}:${today}`

  const dailyCount = await redisCommand(['GET', dailyKey])
  const currentDailyCount = (dailyCount ? parseInt(dailyCount) : 0) + 1

  if (currentDailyCount > maxPerDay) {
    return {
      allowed: false,
      errorType: 'daily',
      message: `Free tier limit reached. Max ${maxPerDay} API calls per day. Upgrade for unlimited access.`,
      remainingDaily: 0,
    }
  }

  // Increment daily counter (expires in 86400 seconds = 24 hours)
  await redisCommand(['SETEX', dailyKey, '86400', currentDailyCount.toString()])

  return {
    allowed: true,
    remainingDaily: Math.max(0, maxPerDay - currentDailyCount),
  }
}

/**
 * Check all rate limits for a user
 * Returns allowed: true if user can proceed, false if rate limited
 */
export async function checkRateLimits(
  keyId: string,
  isPaid: boolean
): Promise<RateLimitCheckResult> {
  const rateLimit = getRateLimit(isPaid ? 'paid' : 'free')

  // Check per-second limit (applies to all users)
  const secondLimitResult = await checkPerSecondLimit(keyId, rateLimit.requestsPerSecond)
  if (!secondLimitResult.allowed) {
    return secondLimitResult
  }

  // Check daily limit (free users only)
  if (!isPaid && rateLimit.dailyCallLimit) {
    const dailyLimitResult = await checkDailyLimit(keyId, rateLimit.dailyCallLimit)
    if (!dailyLimitResult.allowed) {
      return dailyLimitResult
    }
    return dailyLimitResult
  }

  return { allowed: true }
}
