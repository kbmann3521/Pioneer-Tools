import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * Handles Stripe webhook events
 * 
 * Set up in Stripe Dashboard:
 * 1. Go to Webhooks settings
 * 2. Add endpoint: https://yoursite.com/api/stripe/webhook
 * 3. Select events: customer.subscription.created, customer.subscription.updated, customer.subscription.deleted
 * 4. Copy the signing secret and set STRIPE_WEBHOOK_SECRET env var
 */

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (error: any) {
      console.error('Webhook verification failed:', error)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.metadata?.type === 'add_funds') {
          const userId = session.metadata?.userId
          const amount = session.metadata?.amount

          if (userId && amount) {
            const amountInCents = parseInt(amount)

            // Get the payment intent to extract payment method
            let paymentMethodId: string | null = null
            if (session.payment_intent) {
              try {
                const paymentIntent = await stripe.paymentIntents.retrieve(
                  session.payment_intent as string
                )
                paymentMethodId = paymentIntent.payment_method as string || null
              } catch (err) {
                console.error('Failed to retrieve payment intent:', err)
              }
            }

            // Save customer ID for future use
            if (session.customer) {
              await supabaseAdmin
                .from('users_profile')
                .update({
                  stripe_customer_id: session.customer as string,
                })
                .eq('id', userId)
            }

            // Add funds to user balance using RPC function
            const { data, error } = await supabaseAdmin.rpc('record_transaction', {
              p_user_id: userId,
              p_type: 'deposit',
              p_amount: amountInCents,
              p_description: 'Deposited funds via Stripe',
              p_stripe_intent_id: session.payment_intent as string || session.id,
            })

            if (error) {
              console.error(`Error adding funds for user ${userId}:`, error)
            } else {
              console.log(`✅ User ${userId} added $${(amountInCents / 100).toFixed(2)} to their account`)

              // Store the default payment method for auto-recharge
              if (paymentMethodId && session.customer) {
                try {
                  // Set as default payment method on the customer (for auto-recharge)
                  await stripe.customers.update(session.customer as string, {
                    invoice_settings: {
                      default_payment_method: paymentMethodId,
                    },
                  })
                  console.log(`✅ Set payment method ${paymentMethodId} as default for customer`)

                  await supabaseAdmin
                    .from('users_profile')
                    .update({
                      default_payment_method_id: paymentMethodId,
                    })
                    .eq('id', userId)
                  console.log(`✅ Stored default payment method for user ${userId}`)
                } catch (updateError: any) {
                  console.error(`Failed to set default payment method: ${updateError.message}`)
                }
              }
            }
          }
        }
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        if (paymentIntent.metadata?.type === 'add_funds') {
          console.log(`Payment intent succeeded for user ${paymentIntent.metadata?.userId}`)
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        if (paymentIntent.metadata?.type === 'add_funds') {
          const userId = paymentIntent.metadata?.userId

          if (userId) {
            console.log(`Payment failed for user ${userId}. Reason: ${paymentIntent.last_payment_error?.message}`)
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
