/**
 * Auto-recharge logic - handles Stripe payment processing
 * Separated from auth, rate limiting, and billing concerns
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'

interface AutoRechargeProfile {
  id: string
  balance: number
  auto_recharge_enabled?: boolean
  auto_recharge_threshold?: number
  auto_recharge_amount?: number
  stripe_customer_id?: string
  default_payment_method_id?: string
  failed_auto_recharge_count?: number
  successful_auto_recharges_count?: number
  last_auto_recharge_attempt?: string
}

interface AutoRechargeResult {
  triggered: boolean
  succeeded: boolean
  error?: string
  newBalance?: number
}

/**
 * Check if auto-recharge should be triggered
 * Basic config and balance checks only - cooldown/locking handled separately
 */
function shouldTriggerAutoRecharge(
  profile: AutoRechargeProfile,
  balanceAfterDeduction: number
): boolean {
  // Check if auto-recharge is properly configured
  if (
    profile.auto_recharge_enabled !== true ||
    profile.auto_recharge_threshold === undefined ||
    profile.auto_recharge_amount === undefined
  ) {
    return false
  }

  // Check if balance is below threshold
  if (balanceAfterDeduction > profile.auto_recharge_threshold) {
    return false
  }

  return true
}

/**
 * Attempt to charge user's card on file via Stripe
 */
async function chargeCard(
  profile: AutoRechargeProfile
): Promise<{ succeeded: boolean; error?: string }> {
  if (!profile.stripe_customer_id || !profile.default_payment_method_id) {
    return {
      succeeded: false,
      error: 'No payment method on file',
    }
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: profile.auto_recharge_amount!,
      currency: 'usd',
      customer: profile.stripe_customer_id,
      payment_method: profile.default_payment_method_id,
      off_session: true, // Unscheduled recurring payment
      confirm: true,
      metadata: {
        userId: profile.id,
        type: 'auto_recharge',
      },
      description: `Auto-recharge: Add $${(profile.auto_recharge_amount! / 100).toFixed(2)} to Tools Hub account`,
    })

    if (paymentIntent.status === 'succeeded') {
      console.log(
        `✅ Auto-recharge succeeded for user ${profile.id}: charged $${(profile.auto_recharge_amount! / 100).toFixed(2)}`
      )
      return { succeeded: true }
    }

    if (paymentIntent.status === 'requires_action') {
      return {
        succeeded: false,
        error: 'Payment requires additional authentication. Please update payment method.',
      }
    }

    return {
      succeeded: false,
      error: `Payment status: ${paymentIntent.status}`,
    }
  } catch (stripeError: any) {
    const error = stripeError.message || 'Failed to process auto-recharge'
    console.error(`Auto-recharge error for user ${profile.id}:`, stripeError)
    return { succeeded: false, error }
  }
}

/**
 * Update user profile after auto-recharge attempt
 */
async function updateProfileAfterAutoRecharge(
  profile: AutoRechargeProfile,
  succeeded: boolean,
  newBalance: number
): Promise<{ success: boolean; error?: string }> {
  const updates: any = {
    balance: newBalance,
    last_auto_recharge_attempt: new Date().toISOString(),
  }

  if (!succeeded) {
    updates.failed_auto_recharge_count = (profile.failed_auto_recharge_count || 0) + 1
  } else {
    updates.failed_auto_recharge_count = 0
  }

  const { error } = await supabaseAdmin
    .from('users_profile')
    .update(updates)
    .eq('id', profile.id)

  if (error) {
    console.error('Error updating profile after auto-recharge:', error)
    return { success: false, error: 'Error updating profile' }
  }

  return { success: true }
}

/**
 * Record auto-recharge transaction in billing history
 */
async function recordAutoRechargeTransaction(
  userId: string,
  amount: number,
  succeeded: boolean,
  error?: string
): Promise<void> {
  await supabaseAdmin.rpc('record_transaction', {
    p_user_id: userId,
    p_type: 'auto_recharge',
    p_amount: succeeded ? amount : 0,
    p_description: succeeded
      ? `Automatic recharge - card charged successfully`
      : `Auto-recharge failed: ${error}`,
  })
}

/**
 * Atomically claim auto-recharge lock using conditional update
 * Returns true if this request successfully claimed the lock (no other request did in the last 60 seconds)
 */
async function claimAutoRechargeLock(userId: string, lastAttemptTime: string | null): Promise<boolean> {
  const now = new Date()
  const cooldownSeconds = 60
  let shouldClaim = true

  // If we have a recent attempt, check if cooldown is active
  if (lastAttemptTime) {
    const lastAttempt = new Date(lastAttemptTime).getTime()
    const timeSinceLastAttempt = (now.getTime() - lastAttempt) / 1000
    if (timeSinceLastAttempt < cooldownSeconds) {
      console.log(
        `⏳ Auto-recharge cooldown active for user ${userId}. Last attempt was ${timeSinceLastAttempt.toFixed(1)}s ago`
      )
      return false
    }
  }

  // Attempt atomic update: only succeed if last_auto_recharge_attempt hasn't changed
  // This prevents race conditions where multiple concurrent requests try to recharge
  const { data, error } = await supabaseAdmin
    .from('users_profile')
    .update({ last_auto_recharge_attempt: now.toISOString() })
    .eq('id', userId)
    .eq('last_auto_recharge_attempt', lastAttemptTime || null) // Only update if timestamp hasn't changed
    .select()
    .single()

  if (error || !data) {
    // Another request beat us to it
    console.log(
      `🚫 Auto-recharge lock contention: another request already triggered for user ${userId}`
    )
    return false
  }

  return true
}

/**
 * Process auto-recharge if triggered and return new balance
 */
export async function handleAutoRecharge(
  profile: AutoRechargeProfile,
  balanceAfterDeduction: number
): Promise<AutoRechargeResult> {
  // Check basic conditions (enabled, configured, balance below threshold)
  if (!shouldTriggerAutoRecharge(profile, balanceAfterDeduction)) {
    return { triggered: false, succeeded: false }
  }

  // Attempt to claim the auto-recharge lock atomically
  // This ensures only one concurrent request actually triggers the charge
  const lockClaimed = await claimAutoRechargeLock(
    profile.id,
    profile.last_auto_recharge_attempt || null
  )

  if (!lockClaimed) {
    // Another request already triggered auto-recharge
    return { triggered: false, succeeded: false }
  }

  // We own the lock - proceed with charging
  // Attempt to charge card
  const chargeResult = await chargeCard(profile)

  // Calculate new balance
  let newBalance = balanceAfterDeduction
  if (chargeResult.succeeded && profile.auto_recharge_amount) {
    newBalance += profile.auto_recharge_amount
  }

  // Update profile with final state (balance + success/failed counts)
  const { error: updateError } = await supabaseAdmin
    .from('users_profile')
    .update({
      balance: newBalance,
      successful_auto_recharges_count: chargeResult.succeeded ? (profile.successful_auto_recharges_count || 0) + 1 : (profile.successful_auto_recharges_count || 0),
      failed_auto_recharge_count: chargeResult.succeeded ? 0 : (profile.failed_auto_recharge_count || 0) + 1,
      // Note: last_auto_recharge_attempt was already set by claimAutoRechargeLock
    })
    .eq('id', profile.id)

  if (updateError) {
    console.error('Error updating profile after auto-recharge:', updateError)
    return {
      triggered: true,
      succeeded: false,
      error: 'Error updating profile',
    }
  }

  // Record transaction
  await recordAutoRechargeTransaction(
    profile.id,
    profile.auto_recharge_amount || 0,
    chargeResult.succeeded,
    chargeResult.error
  )

  return {
    triggered: true,
    succeeded: chargeResult.succeeded,
    error: chargeResult.error,
    newBalance,
  }
}
