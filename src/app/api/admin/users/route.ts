import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function GET() {
  try {
    let users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        subscriptionStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Fetch real MRR and active subscriptions from Stripe!
    let stripeActiveCount = 0
    let stripeMrr = 0
    let stripeError = null

    try {
      if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_live_...' && process.env.STRIPE_SECRET_KEY !== 'sk_test_...') {
        const subscriptions = await stripe.subscriptions.list({
          status: 'active',
          limit: 100,
        })
        
        stripeActiveCount = subscriptions.data.length
        
        // Sum MRR (assuming amount is in cents)
        subscriptions.data.forEach(sub => {
          if (sub.items.data.length > 0 && sub.items.data[0].price.unit_amount) {
            stripeMrr += (sub.items.data[0].price.unit_amount / 100)
          }
        })
      }
    } catch (err) {
      console.error('Erro ao buscar dados do Stripe:', err)
      stripeError = 'Não foi possível conectar ao Stripe'
    }

    // Fallback para cálculo local se o Stripe falhar ou não estiver configurado corretamente
    const activeProUsers = users.filter((u) => u.subscriptionStatus === 'ACTIVE_PRO')
    
    // Obtendo Global Price caso o MRR do stripe não funcione
    const globalSetting = await prisma.globalSetting.findUnique({ where: { id: 'GLOBAL' }})
    const localPrice = globalSetting?.globalPrice || 250
    const localMrr = activeProUsers.length * localPrice

    return NextResponse.json({
      success: true,
      users,
      metrics: {
        totalUsers: users.length,
        activePro: stripeActiveCount > 0 ? stripeActiveCount : activeProUsers.length,
        totalMrr: stripeMrr > 0 ? stripeMrr : localMrr,
        source: stripeMrr > 0 ? 'stripe' : 'sqlite',
        stripeError
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar usuários do SQLite'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
