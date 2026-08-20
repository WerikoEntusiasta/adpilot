import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'

// In-memory subscription store (single-user app — no DB needed)
// In production, replace with database lookup
const subscriptions = new Map<string, {
  status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing' | 'unpaid'
  subscriptionId: string
  currentPeriodEnd: number
  customerId: string
}>()

export function getSubscriptionStatus(email: string) {
  return subscriptions.get(email) || null
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature') || ''

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[AdPilot Webhook] STRIPE_WEBHOOK_SECRET não configurado')
    return NextResponse.json({ error: 'Webhook secret não configurado' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error(`[AdPilot Webhook] Assinatura inválida: ${message}`)
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
  }

  console.log(`[AdPilot Webhook] Evento recebido: ${event.type}`)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const email = session.customer_email || session.customer_details?.email || ''
        const subscriptionId = session.subscription as string
        const customerId = session.customer as string

        if (subscriptionId && email) {
          // Fetch subscription details to get period end
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)

          subscriptions.set(email, {
            status: subscription.status as 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing' | 'unpaid',
            subscriptionId,
            currentPeriodEnd: (subscription as any).current_period_end,
            customerId,
          })

          console.log(`[AdPilot Webhook] Assinatura ativada para ${email} — Status: ${subscription.status}`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find email by customer ID
        const email = findEmailByCustomerId(customerId)
        if (email) {
          subscriptions.set(email, {
            status: subscription.status as 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing' | 'unpaid',
            subscriptionId: subscription.id,
            currentPeriodEnd: (subscription as any).current_period_end,
            customerId,
          })

          console.log(`[AdPilot Webhook] Assinatura atualizada para ${email} — Status: ${subscription.status}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const email = findEmailByCustomerId(customerId)
        if (email) {
          subscriptions.delete(email)
          console.log(`[AdPilot Webhook] Assinatura cancelada para ${email}`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        const email = findEmailByCustomerId(customerId)

        if (email) {
          const sub = subscriptions.get(email)
          if (sub) {
            sub.status = 'past_due'
            subscriptions.set(email, sub)
          }
          console.log(`[AdPilot Webhook] Pagamento falhou para ${email}`)
        }
        break
      }

      default:
        console.log(`[AdPilot Webhook] Evento não tratado: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao processar webhook'
    console.error(`[AdPilot Webhook] Erro ao processar ${event.type}: ${message}`)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function findEmailByCustomerId(customerId: string): string | undefined {
  for (const [email, sub] of subscriptions.entries()) {
    if (sub.customerId === customerId) return email
  }
  return undefined
}
