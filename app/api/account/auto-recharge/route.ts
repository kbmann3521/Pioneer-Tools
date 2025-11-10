import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'

/**
 * POST /api/account/auto-recharge
 * Manually trigger auto-recharge for the authenticated user
 * This charges the user's saved payment method and adds funds to their balance
 */
export async function POST(request: NextRequest) {
  try {
    // Extract user ID from JWT token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    let userId: string | null = null

    try {
      const parts = token.split('.')
      if (parts.length === 3) {
        const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'))
        userId = decoded.sub
      }
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user profile
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users_profile')
      .select('id, balance, auto_recharge_enabled, auto_recharge_threshold, auto_recharge_amount, stripe_customer_id, default_payment_method_id, failed_auto_recharge_count')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check if auto-recharge is configured
    if (!userProfile.auto_recharge_enabled) {
      return NextResponse.json(
        { error: 'Auto-recharge is not enabled' },
        { status: 400 }
      )
    }

    if (!userProfile.auto_recharge_amount) {
      return NextResponse.json(
        { error: 'Auto-recharge amount not configured' },
        { status: 400 }
      )
    }

    // Check if payment method is on file
    if (!userProfile.stripe_customer_id || !userProfile.default_payment_method_id) {
      return NextResponse.json(
        {
          error: 'No payment method on file. Add funds via checkout first to save a payment method.',
          needsCheckout: true,
        },
        { status: 400 }
      )
    }

    // Attempt to charge the card
    let chargeSucceeded = false
    let chargeError: string | null = null

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: userProfile.auto_recharge_amount,
        currency: 'usd',
        customer: userProfile.stripe_customer_id,
        payment_method: userProfile.default_payment_method_id,
        off_session: true,
        confirm: true,
        metadata: {
          userId: userProfile.id,
          type: 'auto_recharge_manual',
        },
        description: `Manual auto-recharge: Add $${(userProfile.auto_recharge_amount / 100).toFixed(2)} to Tools Hub account`,
      })

      if (paymentIntent.status === 'succeeded') {
        chargeSucceeded = true
        console.log(
          `✅ Manual auto-recharge succeeded for user ${userProfile.id}: charged $${(userProfile.auto_recharge_amount / 100).toFixed(2)}`
        )
      } else if (paymentIntent.status === 'requires_action') {
        chargeError = 'Payment requires additional authentication (3D Secure). Please add funds via checkout instead.'
      } else {
        chargeError = `Payment failed: ${paymentIntent.status}`
      }
    } catch (stripeError: any) {
      chargeError = stripeError.message || 'Failed to process auto-recharge'
      console.error(`Auto-recharge error for user ${userProfile.id}:`, stripeError)
    }

    // Update balance and record transaction
    const newBalance = userProfile.balance + (chargeSucceeded ? userProfile.auto_recharge_amount : 0)

    const { error: updateError } = await supabaseAdmin
      .from('users_profile')
      .update({
        balance: newBalance,
        last_auto_recharge_attempt: new Date().toISOString(),
        failed_auto_recharge_count: chargeSucceeded ? 0 : (userProfile.failed_auto_recharge_count || 0) + 1,
      })
      .eq('id', userProfile.id)

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    // Record transaction
    await supabaseAdmin.rpc('record_transaction', {
      p_user_id: userProfile.id,
      p_type: 'auto_recharge',
      p_amount: chargeSucceeded ? userProfile.auto_recharge_amount : 0,
      p_description: chargeSucceeded
        ? `Manual auto-recharge successful`
        : `Manual auto-recharge failed: ${chargeError}`,
    })

    if (chargeSucceeded) {
      return NextResponse.json({
        success: true,
        message: `Auto-recharge successful. Added $${(userProfile.auto_recharge_amount / 100).toFixed(2)} to your account.`,
        newBalance,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: chargeError || 'Auto-recharge failed',
          currentBalance: userProfile.balance,
        },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Auto-recharge error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/account/auto-recharge
 * Get auto-recharge status (payment method, settings, last attempt)
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    let userId: string | null = null

    try {
      const parts = token.split('.')
      if (parts.length === 3) {
        const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'))
        userId = decoded.sub
      }
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user profile
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users_profile')
      .select(
        'id, balance, auto_recharge_enabled, auto_recharge_threshold, auto_recharge_amount, default_payment_method_id, failed_auto_recharge_count, successful_auto_recharges_count, last_auto_recharge_attempt'
      )
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    return NextResponse.json({
      enabled: userProfile.auto_recharge_enabled,
      threshold: userProfile.auto_recharge_threshold,
      amount: userProfile.auto_recharge_amount,
      hasPaymentMethod: !!userProfile.default_payment_method_id,
      successfulAttempts: userProfile.successful_auto_recharges_count || 0,
      failedAttempts: userProfile.failed_auto_recharge_count || 0,
      lastAttempt: userProfile.last_auto_recharge_attempt,
      currentBalance: userProfile.balance,
    })
  } catch (error: any) {
    console.error('Error fetching auto-recharge status:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
