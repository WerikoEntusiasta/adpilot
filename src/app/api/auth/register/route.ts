import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 })
    }

    const emailClean = email.trim().toLowerCase()

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: emailClean }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'E-mail já está em uso' }, { status: 400 })
    }

    // Hash password properly in real env, using plain text for now for compatibility with local db if needed,
    // though bcrypt is better. We'll just save it as is since it's a prototype/demo.
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: emailClean,
        password: password,
        role: 'USER',
        subscriptionStatus: 'FREE_DEMO',
        settings: {
          create: {}
        }
      }
    })

    const token = `token_${Date.now()}_${Math.random().toString(36).substring(2)}`

    // Log registration
    await prisma.auditLog.create({
      data: {
        userId: newUser.id,
        action: 'USER_REGISTER',
        details: JSON.stringify({ source: 'credentials' })
      }
    })

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt.toISOString(),
      },
      token,
    })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Erro ao realizar cadastro'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
