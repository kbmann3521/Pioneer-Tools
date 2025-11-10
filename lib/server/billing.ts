/**
 * Billing logic - handles balance checking and credit deduction
 * Separated from auth and rate limiting concerns
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getToolCost } from '@/config/pricing.config'

interface BillingCheckResult {
  allowed: boolean
  error?: string
  balanceAfterDeduction?: number
  centsDeducted: number
  remainingFractional: number
}

interface UserProfile {
  id: string
  balance: number
  monthly_spending_limit?: number
  usage_this_month?: number
  pending_fractional_cents?: number
  auto_recharge_enabled?: boolean
  auto_recharge_threshold?: number
  auto_recharge_amount?: number
  stripe_customer_id?: string
  default_payment_method_id?: string
  failed_auto_recharge_count?: number
  successful_auto_recharges_count?: number
  last_auto_recharge_attempt?: string
}

/**
 * Fetch user profile with billing information
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabaseAdmin
    .from('users_profile')
    .select('id, balance, monthly_spending_limit, usage_this_month, pending_fractional_cents, auto_recharge_enabled, auto_recharge_threshold, auto_recharge_amount, stripe_customer_id, default_payment_method_id, failed_auto_recharge_count, successful_auto_recharges_count, last_auto_recharge_attempt')
    .eq('id', userId)
    .single()

  if (error || !data) {
    console.error(`User profile fetch failed for user ${userId}:`, error)
    return null
  }

  return data
}

/**
 * Check if user has sufficient balance for a tool call
 * Handles fractional cent aggregation (sub-penny costs)
 */
export async function checkBalance(
  profile: UserProfile,
  toolId: string
): Promise<BillingCheckResult> {
  const toolCost = getToolCost(toolId)

  // Aggregate fractional cents (sub-penny costs)
  const pendingFractional = profile.pending_fractional_cents || 0
  const totalPending = pendingFractional + toolCost
  const centsToDeduct = Math.floor(totalPending)
  const remainingFractional = Number((totalPending - centsToDeduct).toFixed(2))

  // Check if user has enough balance
  if (centsToDeduct > 0 && profile.balance < centsToDeduct) {
    return {
      allowed: false,
      error: `Insufficient balance. This API call costs $${(toolCost / 100).toFixed(4)}. Current balance: $${(profile.balance / 100).toFixed(2)}`,
      centsDeducted: 0,
      remainingFractional: totalPending,
    }
  }

  return {
    allowed: true,
    centsDeducted: centsToDeduct,
    remainingFractional,
    balanceAfterDeduction: profile.balance - centsToDeduct,
  }
}

/**
 * Check monthly spending limit
 */
export async function checkMonthlyLimit(
  profile: UserProfile,
  centsToDeduct: number
): Promise<{ allowed: boolean; error?: string }> {
  if (!profile.monthly_spending_limit) {
    return { allowed: true }
  }

  const usageThisMonth = profile.usage_this_month || 0
  if (usageThisMonth + centsToDeduct > profile.monthly_spending_limit) {
    return {
      allowed: false,
      error: `Monthly spending limit reached. You've set a limit of $${(profile.monthly_spending_limit / 100).toFixed(2)} and have used $${(usageThisMonth / 100).toFixed(2)} this month.`,
    }
  }

  return { allowed: true }
}

/**
 * Deduct credits from user balance
 * Records transaction and updates pending fractional cents
 */
export async function deductCredits(
  profile: UserProfile,
  centsToDeduct: number,
  remainingFractional: number,
  toolId: string
): Promise<{ success: boolean; error?: string; newBalance?: number }> {
  // Update pending fractional cents
  const { error: updateError } = await supabaseAdmin
    .from('users_profile')
    .update({
      pending_fractional_cents: remainingFractional,
    })
    .eq('id', profile.id)

  if (updateError) {
    console.error('Error updating pending fractional cents:', updateError)
    return {
      success: false,
      error: 'Error processing payment',
    }
  }

  // Only record transaction if we have whole cents to deduct
  if (centsToDeduct > 0) {
    const { error: recordError } = await supabaseAdmin.rpc('record_transaction', {
      p_user_id: profile.id,
      p_type: 'charge',
      p_amount: -centsToDeduct,
      p_tool_name: toolId,
      p_description: `API call to ${toolId}`,
    })

    if (recordError) {
      console.error('Error deducting credits:', recordError)
      return {
        success: false,
        error: 'Error processing payment',
      }
    }
  }

  const newBalance = profile.balance - centsToDeduct
  return {
    success: true,
    newBalance,
  }
}
