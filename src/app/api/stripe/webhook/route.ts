import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

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
        const customerId = session.customer as string

        if (email && customerId) {
          // Atualiza o banco de dados via Prisma
          await prisma.user.updateMany({
            where: { email },
            data: {
              subscriptionStatus: 'ACTIVE_PRO',
              stripeCustomerId: customerId
            }
          })
          console.log(`[AdPilot Webhook] Assinatura ativada no SQLite para ${email}`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        
        const statusMap: Record<string, string> = {
          active: 'ACTIVE_PRO',
          past_due: 'FREE_DEMO',
          unpaid: 'FREE_DEMO',
          canceled: 'FREE_DEMO',
        }
        
        const newStatus = statusMap[subscription.status] || 'FREE_DEMO'

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { subscriptionStatus: newStatus }
        })
        console.log(`[AdPilot Webhook] Assinatura atualizada no SQLite para status: ${subscription.status}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { subscriptionStatus: 'FREE_DEMO' }
        })
        console.log(`[AdPilot Webhook] Assinatura cancelada no SQLite para stripeCustomerId: ${customerId}`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { subscriptionStatus: 'FREE_DEMO' }
        })
        console.log(`[AdPilot Webhook] Pagamento falhou. Rebaixado para FREE_DEMO.`)
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
