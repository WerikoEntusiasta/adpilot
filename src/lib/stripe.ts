import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key_for_adpilot', {
  apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion,
})

export const PLAN_PRICE_BRL = 250.00
export const PLAN_PRICE_CENTS = 25000 // R$ 250,00 em centavos

export async function createStripeCheckoutSession({
  userEmail,
  successUrl,
  cancelUrl,
}: {
  userEmail?: string
  successUrl: string
  cancelUrl: string
}) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer_email: userEmail || undefined,
    line_items: [
      {
        price_data: {
          currency: 'brl',
          product_data: {
            name: 'AdPilot AI — Assinatura Pro',
            description: 'Gestão Inteligente de Tráfego Pago com IA Autônoma & Facebook Ads API',
          },
          unit_amount: PLAN_PRICE_CENTS, // R$ 250,00
          recurring: {
            interval: 'month',
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${successUrl}?payment=success`,
    cancel_url: `${cancelUrl}?payment=cancelled`,
  })

  return session
}
