import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-06-30.basil',
  typescript: true,
  appInfo: {
    name: 'AdPilot AI',
    version: '1.0.0',
  },
})

/**
 * Preço da assinatura mensal do AdPilot AI: R$250,00
 * Usa STRIPE_PRICE_ID se configurado, senão fallback para price_data inline.
 */
export async function createAdPilotCheckoutSession(params: {
  email: string
  successUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
}) {
  const { email, successUrl, cancelUrl, metadata } = params
  const priceId = process.env.STRIPE_PRICE_ID

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: metadata || {},
    subscription_data: {
      trial_period_days: 7,
      metadata: metadata || {},
    },
  }

  if (priceId) {
    // Use configured Price ID from Stripe Dashboard
    sessionParams.line_items = [
      {
        price: priceId,
        quantity: 1,
      },
    ]
  } else {
    // Fallback: inline price_data (R$250/month BRL)
    console.warn('[AdPilot] STRIPE_PRICE_ID não configurado — usando price_data inline. Configure o preço no Stripe Dashboard.')
    sessionParams.line_items = [
      {
        price_data: {
          currency: 'brl',
          product_data: {
            name: 'AdPilot AI - Assinatura Mensal',
            description: 'Acesso completo ao AdPilot AI por 1 mês',
          },
          recurring: {
            interval: 'month',
          },
          unit_amount: 25000, // R$250,00 = 25000 centavos
        },
        quantity: 1,
      },
    ]
  }

  const session = await stripe.checkout.sessions.create(sessionParams)
  return { sessionId: session.id, url: session.url }
}
