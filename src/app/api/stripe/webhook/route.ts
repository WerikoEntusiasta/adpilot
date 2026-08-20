import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature') || ''

  try {
    let event

    if (process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
    } else {
      event = JSON.parse(body)
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        console.log('Pagamento do Stripe concluído com sucesso para:', session.customer_email)
        break
      }
      case 'invoice.payment_succeeded': {
        console.log('Mensalidade de R$ 250,00 paga no Stripe!')
        break
      }
      default:
        console.log(`Evento do Stripe recebido: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao processar Webhook Stripe'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
