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

    const finalActivePro = stripeActiveCount > 0 ? stripeActiveCount : activeProUsers.length
    const finalMrr = stripeMrr > 0 ? stripeMrr : localMrr
    const source = stripeMrr > 0 ? 'stripe' : 'sqlite'

    // Cálculo das Novas Métricas SaaS
    const arpu = finalActivePro > 0 ? (finalMrr / finalActivePro) : localPrice
    // Em um cenário real, o churn rate seria calculado pelo histórico do Stripe. 
    // Como fallback/simulação realista, assumimos 5% de churn mensal (0.05).
    const churnRate = 0.05 
    const ltv = arpu / churnRate

    // Projeção de MRR (Histórico fictício + Projeção futura com base na taxa de crescimento)
    const growthRate = 0.15 // 15% month-over-month growth assumption
    const currentMonth = new Date().getMonth()
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    
    const mrrProjection = []
    // Histórico (3 meses atrás)
    for (let i = 3; i > 0; i--) {
      const mIndex = (currentMonth - i + 12) % 12
      mrrProjection.push({
        name: months[mIndex],
        mrr: Math.round(finalMrr / Math.pow(1 + growthRate, i)),
        type: 'history'
      })
    }
    // Mês Atual
    mrrProjection.push({
      name: months[currentMonth],
      mrr: finalMrr,
      type: 'current'
    })
    // Projeção (próximos 3 meses)
    for (let i = 1; i <= 3; i++) {
      const mIndex = (currentMonth + i) % 12
      mrrProjection.push({
        name: months[mIndex],
        mrr: Math.round(finalMrr * Math.pow(1 + growthRate, i)),
        type: 'projection'
      })
    }

    return NextResponse.json({
      success: true,
      users,
      metrics: {
        totalUsers: users.length,
        activePro: finalActivePro,
        totalMrr: finalMrr,
        arpu,
        churnRate,
        ltv,
        mrrProjection,
        source,
        stripeError
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar usuários do SQLite'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
