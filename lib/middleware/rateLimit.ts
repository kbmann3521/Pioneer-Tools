import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'
import { getToolCost, getRateLimit, RATE_LIMITS } from '@/config/pricing.config'

export interface RateLimitResult {
  success: boolean
  remaining: number | null
  balance: number | null
  message?: string
  toolCost?: number
  errorType?: 'per-second' | 'daily' | 'balance' | 'monthly-limit' | 'invalid-key'
}

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

if (!UPSTASH_URL || !UPSTASH_TOKEN) {
  console.warn('Upstash Redis credentials not configured. Rate limiting partially disabled.')
}

async function redisCommand(command: string[]): Promise<any> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return null
  }

  try {
    // Upstash REST API format: POST to base URL with command
    // Command format: ["GET", "key"] becomes {"GET": "key"} or array format
    const commandName = command[0].toUpperCase()

    // Build request body - Upstash uses array format
    const body = JSON.stringify(command)

    const response = await fetch(UPSTASH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: body,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Upstash error [${response.status}]: ${errorText}`)
      throw new Error(`Redis error: ${response.statusText}`)
    }

    const data = await response.json()
    // Upstash returns result directly or in "result" field depending on command
    return data.result !== undefined ? data.result : data
  } catch (error) {
    console.error('Redis command error:', error)
    return null
  }
}

/**
 * Validate API key and apply rate limiting
 * 
 * For FREE users:
 * - Max 100 API calls per day
 * - Max 1 request per second
 * - NO credits deducted
 * 
 * For PAID users (have positive balance):
 * - Unlimited API calls
 * - Max 10 requests per second
 * - Credits deducted per call based on tool
 * - Check monthly spending limit
 */
export async function validateAndLimitApiKey(
  apiKeyHeader: string,
  toolId: string
): Promise<RateLimitResult> {
  try {
    // Extract key from "Bearer pk_xxx" format
    const keyMatch = apiKeyHeader.match(/^Bearer\s+(.+)$/)
    if (!keyMatch) {
      return {
        success: false,
        remaining: null,
        balance: null,
        message: 'Invalid authorization header format',
        errorType: 'invalid-key',
      }
    }

    const apiKey = keyMatch[1]

    // Fetch API key from database
    const { data: keyRecord, error: keyError } = await supabaseAdmin
      .from('api_keys')
      .select('id, user_id')
      .eq('key', apiKey)
      .single()

    if (keyError || !keyRecord) {
      return {
        success: false,
        remaining: null,
        balance: null,
        message: 'Invalid API key',
        errorType: 'invalid-key',
      }
    }

    // Fetch user profile to get balance and plan type
    // Note: Some columns may not exist if migrations haven't been fully run
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users_profile')
      .select('id, balance, monthly_spending_limit, auto_recharge_enabled, auto_recharge_threshold, auto_recharge_amount, stripe_customer_id, default_payment_method_id, failed_auto_recharge_count, usage_this_month, pending_fractional_cents')
      .eq('id', keyRecord.user_id)
      .single()

    if (userError || !userProfile) {
      console.error(`User profile fetch failed for user ${keyRecord.user_id}:`, userError)
      return {
        success: false,
        remaining: null,
        balance: null,
        message: `User not found: ${userError?.message || 'no data'}`,
        errorType: 'invalid-key',
      }
    }

    // Determine if user is paid (has positive balance) or free (balance <= 0)
    const isPaid = userProfile.balance > 0
    const rateLimit = getRateLimit(isPaid ? 'paid' : 'free')
    const now = Math.floor(Date.now() / 1000)
    const today = new Date().toISOString().split('T')[0]
    const minuteKey = `ratelimit:${keyRecord.id}:${Math.floor(now / 60)}`
    const dailyKey = `daily:${keyRecord.id}:${today}`
    const secondKey = `second:${keyRecord.id}:${Math.floor(now)}`

    // Check per-second rate limit
    const secondCount = await redisCommand(['GET', secondKey])
    const currentSecondCount = (secondCount ? parseInt(secondCount) : 0) + 1

    if (currentSecondCount > rateLimit.requestsPerSecond) {
      return {
        success: false,
        remaining: null,
        balance: userProfile.balance,
        message: `Rate limit exceeded. Max ${rateLimit.requestsPerSecond} request(s) per second`,
        toolCost: getToolCost(toolId),
        errorType: 'per-second',
      }
    }

    // For FREE users: check daily call limit
    if (!isPaid) {
      const dailyCount = await redisCommand(['GET', dailyKey])
      const currentDailyCount = (dailyCount ? parseInt(dailyCount) : 0) + 1

      if (
        rateLimit.dailyCallLimit &&
        currentDailyCount > rateLimit.dailyCallLimit
      ) {
        return {
          success: false,
          remaining: null,
          balance: userProfile.balance,
          message: `Free tier limit reached. Max ${rateLimit.dailyCallLimit} API calls per day. Upgrade for unlimited access.`,
          toolCost: getToolCost(toolId),
          errorType: 'daily',
        }
      }

      // Increment daily counter (expires in 86400 seconds = 24 hours)
      await redisCommand(['SETEX', dailyKey, '86400', currentDailyCount.toString()])
    }

    // For PAID users: check balance and monthly limit
    if (isPaid) {
      const toolCost = getToolCost(toolId)

      // Aggregate fractional cents (sub-penny costs)
      // Only deduct from balance when accumulated >= 1 cent
      const pendingFractional = (userProfile as any).pending_fractional_cents || 0
      const totalPending = pendingFractional + toolCost
      const centsToDeduct = Math.floor(totalPending) // Only whole cents
      const remainingFractional = Number((totalPending - centsToDeduct).toFixed(2)) // Keep fractional part for next time

      // Check if user has enough balance for the cents to deduct (if any)
      if (centsToDeduct > 0 && userProfile.balance < centsToDeduct) {
        return {
          success: false,
          remaining: null,
          balance: userProfile.balance,
          message: `Insufficient balance. This API call costs ${(toolCost / 100).toFixed(3)}. Current balance: $${(userProfile.balance / 100).toFixed(2)}`,
          toolCost,
          errorType: 'balance',
        }
      }

      // Check monthly spending limit
      const usageThisMonth = (userProfile as any).usage_this_month || 0
      if (
        userProfile.monthly_spending_limit &&
        usageThisMonth + centsToDeduct > userProfile.monthly_spending_limit
      ) {
        return {
          success: false,
          remaining: null,
          balance: userProfile.balance,
          message: `Monthly spending limit reached. You've set a limit of $${(userProfile.monthly_spending_limit / 100).toFixed(2)} and have used $${(usageThisMonth / 100).toFixed(2)} this month.`,
          errorType: 'monthly-limit',
          toolCost,
        }
      }
    }

    // Increment per-second counter (expires in 1 second)
    await redisCommand(['SETEX', secondKey, '1', currentSecondCount.toString()])

    // For PAID users: deduct credits with fractional aggregation
    if (isPaid) {
      const toolCost = getToolCost(toolId)

      // Recalculate aggregated pending cents
      const pendingFractional = (userProfile as any).pending_fractional_cents || 0
      const totalPending = pendingFractional + toolCost
      const centsToDeduct = Math.floor(totalPending)
      const remainingFractional = Number((totalPending - centsToDeduct).toFixed(2))

      // Update pending fractional cents and deduct from balance if needed
      const { error: updateError } = await supabaseAdmin
        .from('users_profile')
        .update({
          pending_fractional_cents: remainingFractional,
        })
        .eq('id', userProfile.id)

      if (updateError) {
        console.error('Error updating pending fractional cents:', updateError)
        return {
          success: false,
          remaining: null,
          balance: userProfile.balance,
          message: 'Error processing payment',
          toolCost,
        }
      }

      // Only record transaction if we have whole cents to deduct
      if (centsToDeduct > 0) {
        const { error: recordError } = await supabaseAdmin.rpc('record_transaction', {
          p_user_id: userProfile.id,
          p_type: 'charge',
          p_amount: -centsToDeduct,
          p_tool_name: toolId,
          p_description: `API call to ${toolId} (aggregated from ${totalPending.toFixed(2)} cents)`,
        })

        if (recordError) {
          console.error('Error deducting credits:', recordError)
          return {
            success: false,
            remaining: null,
            balance: userProfile.balance,
            message: 'Error processing payment',
            toolCost,
          }
        }
      } else {
        // Cost was sub-penny and aggregated, log it but don't deduct yet
        console.log(`Sub-penny cost aggregated: ${toolCost} + ${pendingFractional} = ${totalPending} cents (pending)`)
      }

      // Check if auto-recharge should trigger (use actual deducted amount)
      const balanceAfterDeduction = userProfile.balance - centsToDeduct
      if (
        userProfile.auto_recharge_enabled &&
        userProfile.auto_recharge_threshold &&
        userProfile.auto_recharge_amount &&
        balanceAfterDeduction <= userProfile.auto_recharge_threshold
      ) {
        // Attempt to charge user's card on file
        let chargeSucceeded = false
        let chargeError: string | null = null

        if (userProfile.stripe_customer_id && userProfile.default_payment_method_id) {
          try {
            // Create a payment intent to charge the default payment method
            const paymentIntent = await stripe.paymentIntents.create({
              amount: userProfile.auto_recharge_amount,
              currency: 'usd',
              customer: userProfile.stripe_customer_id,
              payment_method: userProfile.default_payment_method_id,
              off_session: true, // Indicates this is an unscheduled recurring payment (auto-recharge)
              confirm: true, // Automatically confirm and attempt to charge
              metadata: {
                userId: userProfile.id,
                type: 'auto_recharge',
              },
              description: `Auto-recharge: Add $${(userProfile.auto_recharge_amount / 100).toFixed(2)} to Tools Hub account`,
            })

            if (paymentIntent.status === 'succeeded') {
              chargeSucceeded = true
              console.log(`✅ Auto-recharge succeeded for user ${userProfile.id}: charged $${(userProfile.auto_recharge_amount / 100).toFixed(2)}`)
            } else if (paymentIntent.status === 'requires_action') {
              chargeError = 'Payment requires additional authentication. Please update payment method.'
              console.warn(`Auto-recharge requires action for user ${userProfile.id}`)
            } else {
              chargeError = `Payment status: ${paymentIntent.status}`
              console.warn(`Auto-recharge failed for user ${userProfile.id}: ${chargeError}`)
            }
          } catch (stripeError: any) {
            chargeError = stripeError.message || 'Failed to process auto-recharge'
            console.error(`Auto-recharge error for user ${userProfile.id}:`, stripeError)
          }
        } else {
          chargeError = 'No payment method on file'
          console.warn(`Cannot auto-recharge user ${userProfile.id}: no payment method stored`)
        }

        // Update balance and record transaction
        let newBalance = userProfile.balance - centsToDeduct
        if (chargeSucceeded) {
          newBalance += userProfile.auto_recharge_amount
        }

        const updates: any = {
          balance: newBalance,
          last_auto_recharge_attempt: new Date().toISOString(),
        }

        if (!chargeSucceeded) {
          updates.failed_auto_recharge_count = (userProfile.failed_auto_recharge_count || 0) + 1
        } else {
          updates.failed_auto_recharge_count = 0
        }

        await supabaseAdmin
          .from('users_profile')
          .update(updates)
          .eq('id', userProfile.id)

        // Record transaction using RPC
        if (chargeSucceeded) {
          await supabaseAdmin.rpc('record_transaction', {
            p_user_id: userProfile.id,
            p_type: 'auto_recharge',
            p_amount: userProfile.auto_recharge_amount,
            p_description: 'Automatic recharge - card charged successfully',
          })
        } else {
          // Record failed attempt
          await supabaseAdmin.rpc('record_transaction', {
            p_user_id: userProfile.id,
            p_type: 'auto_recharge',
            p_amount: 0,
            p_description: `Auto-recharge failed: ${chargeError}`,
          })
        }

        // Update last_used timestamp
        await supabaseAdmin
          .from('api_keys')
          .update({ last_used: new Date().toISOString() })
          .eq('id', keyRecord.id)

        return {
          success: true,
          remaining: newBalance,
          balance: newBalance,
          toolCost,
          message: chargeSucceeded ? 'Auto-recharge successful' : `Auto-recharge failed: ${chargeError}`,
        }
      }

      // Update last_used timestamp
      await supabaseAdmin
        .from('api_keys')
        .update({ last_used: new Date().toISOString() })
        .eq('id', keyRecord.id)

      return {
        success: true,
        remaining: balanceAfterDeduction,
        balance: balanceAfterDeduction,
        toolCost,
      }
    }

    // FREE user: update last_used and return
    await supabaseAdmin
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('id', keyRecord.id)

    const dailyCount = await redisCommand(['GET', dailyKey])
    const remainingDaily = rateLimit.dailyCallLimit
      ? Math.max(0, rateLimit.dailyCallLimit - (dailyCount ? parseInt(dailyCount) : 0))
      : null

    return {
      success: true,
      remaining: remainingDaily,
      balance: userProfile.balance,
      toolCost: 0, // Free users don't pay
    }
  } catch (error: any) {
    console.error('Rate limit check error:', error)
    return {
      success: false,
      remaining: null,
      balance: null,
      message: 'Rate limit check failed',
    }
  }
}
