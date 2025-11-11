import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'

export async function GET(request: NextRequest) {
  try {
    // Extract user ID from JWT token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let userId: string | null = null
    try {
      const parts = authHeader.replace('Bearer ', '').split('.')
      if (parts.length === 3) {
        const decoded = JSON.parse(
          Buffer.from(parts[1], 'base64').toString('utf-8')
        )
        userId = decoded.sub
      }
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 401 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check payment method
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users_profile')
      .select('stripe_customer_id, default_payment_method_id')
      .eq('id', userId)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    const hasPaymentMethod = !!(
      profile?.stripe_customer_id && 
      profile?.default_payment_method_id
    )

    // Get auto-recharge attempt counts
    const { data: allAttempts, error: transactionError } = await supabaseAdmin
      .from('billing_transactions')
      .select('*')
      .eq('user_id', userId)
      .in('type', ['auto_recharge', 'refund'])
      .order('created_at', { ascending: false })

    if (transactionError) {
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    // Count successful and failed attempts
    const successfulAttempts = allAttempts?.filter(
      tx => tx.type === 'auto_recharge' && tx.amount > 0
    ).length || 0

    const failedAttempts = allAttempts?.filter(
      tx => tx.type === 'refund' || (tx.type === 'auto_recharge' && tx.amount < 0)
    ).length || 0

    const lastAttempt = allAttempts && allAttempts.length > 0 
      ? allAttempts[0].created_at 
      : null

    return NextResponse.json({
      hasPaymentMethod,
      successfulAttempts,
      failedAttempts,
      lastAttempt,
    })
  } catch (error: any) {
    console.error('Error fetching auto-recharge status:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Extract user ID from JWT token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let userId: string | null = null
    try {
      const parts = authHeader.replace('Bearer ', '').split('.')
      if (parts.length === 3) {
        const decoded = JSON.parse(
          Buffer.from(parts[1], 'base64').toString('utf-8')
        )
        userId = decoded.sub
      }
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 401 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users_profile')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    // Check if user has payment method on file
    if (!profile.stripe_customer_id || !profile.default_payment_method_id) {
      return NextResponse.json(
        { 
          error: 'No payment method on file. Add funds via checkout first.',
          needsCheckout: true 
        },
        { status: 400 }
      )
    }

    // Check if auto-recharge is enabled and configured
    if (!profile.auto_recharge_enabled || !profile.auto_recharge_amount) {
      return NextResponse.json(
        { error: 'Auto-recharge is not enabled or configured' },
        { status: 400 }
      )
    }

    // Charge the user's card
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: profile.auto_recharge_amount,
        currency: 'usd',
        customer: profile.stripe_customer_id,
        payment_method: profile.default_payment_method_id,
        off_session: true,
        confirm: true,
        metadata: {
          type: 'auto_recharge',
          userId,
        },
      })

      if (paymentIntent.status !== 'succeeded') {
        // Record failed attempt
        await supabaseAdmin.rpc('record_transaction', {
          p_user_id: userId,
          p_type: 'refund',
          p_amount: -profile.auto_recharge_amount,
          p_description: `Auto-recharge failed: ${paymentIntent.status}`,
          p_stripe_intent_id: paymentIntent.id,
        })

        return NextResponse.json(
          { error: `Payment failed: ${paymentIntent.status}` },
          { status: 400 }
        )
      }

      // Record successful transaction
      await supabaseAdmin.rpc('record_transaction', {
        p_user_id: userId,
        p_type: 'auto_recharge',
        p_amount: profile.auto_recharge_amount,
        p_description: 'Automatic recharge - card charged successfully',
        p_stripe_intent_id: paymentIntent.id,
      })

      return NextResponse.json({
        message: `Auto-recharge successful! Added $${(profile.auto_recharge_amount / 100).toFixed(2)} to your account.`,
      })
    } catch (stripeError: any) {
      // Record failed attempt
      await supabaseAdmin.rpc('record_transaction', {
        p_user_id: userId,
        p_type: 'refund',
        p_amount: -profile.auto_recharge_amount,
        p_description: `Auto-recharge failed: ${stripeError.message}`,
      })

      console.error('Stripe charge failed:', stripeError)
      return NextResponse.json(
        { error: stripeError.message || 'Payment processing failed' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Error processing auto-recharge:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
