import { NextResponse } from 'next/server'
import { createStripeCheckoutSession } from '@/lib/stripe'

export async function POST(request: Request) {
  try {
    const { userEmail } = await request.json()

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const successUrl = `${origin}/dashboard`
    const cancelUrl = `${origin}/`

    // Create session via Stripe SDK using environment variables
    const session = await createStripeCheckoutSession({
      userEmail,
      successUrl,
      cancelUrl,
    })

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar sessão de pagamento no Stripe'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
