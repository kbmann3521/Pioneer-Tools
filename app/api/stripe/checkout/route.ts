import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { supabase } from '@/lib/supabaseClient'

/**
 * Creates a Stripe checkout session for upgrading to Pro plan
 * 
 * Usage:
 * POST /api/stripe/checkout
 * Body: { planId: 'pro' }
 */

export async function POST(request: NextRequest) {
  try {
    // Get the current user's session
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { planId } = body

    if (planId !== 'pro') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Get user profile
    const { data: userProfile } = await supabaseAdmin
      .from('users_profile')
      .select('stripe_customer_id, plan')
      .eq('id', session.user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Don't allow re-upgrading
    if (userProfile.plan === 'pro') {
      return NextResponse.json({ error: 'Already on Pro plan' }, { status: 400 })
    }

    // Get or create Stripe customer
    let customerId = userProfile.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        metadata: {
          userId: session.user.id,
        },
      })
      customerId = customer.id

      // Update user profile with customer ID
      await supabaseAdmin
        .from('users_profile')
        .update({ stripe_customer_id: customerId })
        .eq('id', session.user.id)
    }

    // Create checkout session
    // Note: You'll need to set up a Price in Stripe and update STRIPE_PRO_PRICE_ID
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID || 'price_1MrsUYLMd4xcCIwa',
          quantity: 1,
        },
      ],
      success_url: `${request.nextUrl.origin}/dashboard?success=true`,
      cancel_url: `${request.nextUrl.origin}/dashboard?canceled=true`,
      metadata: {
        userId: session.user.id,
        plan: 'pro',
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
