import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { supabase } from '@/lib/supabaseClient'
import { PRICING } from '@/config/pricing.config'

/**
 * Create a Stripe checkout session for adding funds to account
 * 
 * Usage:
 * POST /api/stripe/add-funds
 * Body: { amount: 1500 } // amount in cents ($15.00)
 */

export async function POST(request: NextRequest) {
  try {
    // Get auth token from request headers
    const authHeader = request.headers.get('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    // Extract user ID from JWT token
    let userId: string | null = null
    try {
      const parts = token.split('.')
      if (parts.length === 3) {
        // Decode the payload (second part)
        const decoded = JSON.parse(
          Buffer.from(parts[1], 'base64').toString('utf-8')
        )
        userId = decoded.sub // 'sub' is the user ID claim in Supabase JWT
      }
    } catch (parseError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { amount } = body

    // Validate amount
    if (!amount || amount < PRICING.MINIMUM_DEPOSIT) {
      return NextResponse.json(
        { error: `Minimum deposit is $${(PRICING.MINIMUM_DEPOSIT / 100).toFixed(2)}` },
        { status: 400 }
      )
    }

    // Ensure user profile exists by calling ensure-profile endpoint
    try {
      const ensureProfileResponse = await fetch(`${request.nextUrl.origin}/api/account/ensure-profile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!ensureProfileResponse.ok) {
        let errorData
        try {
          errorData = await ensureProfileResponse.json()
        } catch {
          return NextResponse.json(
            { error: `Profile initialization failed with status ${ensureProfileResponse.status}` },
            { status: 500 }
          )
        }
        return NextResponse.json(
          { error: errorData.error || 'Failed to initialize user profile' },
          { status: ensureProfileResponse.status }
        )
      }

      // Verify response is JSON before parsing
      const contentType = ensureProfileResponse.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        return NextResponse.json(
          { error: 'Invalid response from profile service' },
          { status: 500 }
        )
      }
    } catch (ensureError: any) {
      console.error('Error calling ensure-profile:', ensureError)
      return NextResponse.json(
        { error: 'Failed to initialize user profile' },
        { status: 500 }
      )
    }

    // Get user profile
    const { data: userProfile, error: selectError } = await supabaseAdmin
      .from('users_profile')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (!userProfile) {
      console.error('User profile still missing after ensure-profile:', selectError)
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 })
    }

    // Get user email from auth
    const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (!authUser?.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 })
    }

    // Get or create Stripe customer
    let customerId = userProfile.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: authUser.email,
        metadata: {
          userId: userId,
        },
      })
      customerId = customer.id

      // Update user profile with customer ID
      await supabaseAdmin
        .from('users_profile')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId)
    }

    // Create checkout session that both charges AND saves the payment method
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_intent_data: {
        setup_future_usage: 'off_session', // Save the payment method for future use (auto-recharge)
        metadata: {
          userId: userId,
          type: 'add_funds',
        },
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Add Funds to Tools Hub Account',
              description: `Add $${(amount / 100).toFixed(2)} to your account balance`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${request.nextUrl.origin}/dashboard?payment=success`,
      cancel_url: `${request.nextUrl.origin}/dashboard?payment=cancelled`,
      metadata: {
        userId: userId,
        amount: amount.toString(),
        type: 'add_funds',
      },
    })

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
