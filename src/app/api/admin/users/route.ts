import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    // If database has no users yet, seed initial real users
    if (users.length === 0) {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@adpilot.ai'
      await prisma.user.createMany({
        data: [
          {
            name: 'Administrador AdPilot',
            email: adminEmail,
            password: 'hashed_admin_pwd',
            role: 'ADMIN',
            subscriptionStatus: 'ACTIVE_PRO',
          },
          {
            name: 'Carlos Eduardo',
            email: 'carlos@empresa.com.br',
            password: 'hashed_pwd_2',
            role: 'USER',
            subscriptionStatus: 'ACTIVE_PRO',
          },
          {
            name: 'Fernanda Lima',
            email: 'fernanda@digitalmkt.com',
            password: 'hashed_pwd_3',
            role: 'USER',
            subscriptionStatus: 'FREE_DEMO',
          },
        ],
      })

      users = await prisma.user.findMany({
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
    }

    const activeProUsers = users.filter((u) => u.subscriptionStatus === 'ACTIVE_PRO')
    const totalMrr = activeProUsers.length * 250

    return NextResponse.json({
      success: true,
      users,
      metrics: {
        totalUsers: users.length,
        activePro: activeProUsers.length,
        totalMrr,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar usuários do SQLite'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
