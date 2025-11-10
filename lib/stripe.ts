import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  throw new Error('Missing Stripe Secret Key')
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
})

export const STRIPE_PLANS = {
  free: {
    name: 'Free',
    rateLimit: 200,
    priceId: null,
  },
  pro: {
    name: 'Pro',
    rateLimit: 2000,
    priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_1MrsUYLMd4xcCIwa',
  },
}
