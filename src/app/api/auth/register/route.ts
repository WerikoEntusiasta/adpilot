import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

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

    // Hash password properly for LGPD compliance (Art. 46)
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: emailClean,
        password: hashedPassword,
        role: 'USER',
        subscriptionStatus: 'FREE_DEMO',
        settings: {
          create: {}
        }
      }
    })

    const token = `token_${Date.now()}_${Math.random().toString(36).substring(2)}`

    // Get IP and User-Agent
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'IP Desconhecido'
    const userAgent = request.headers.get('user-agent') || 'Desconhecido'

    // Log registration
    await prisma.auditLog.create({
      data: {
        userId: newUser.id,
        action: 'USER_REGISTER_TERMS_ACCEPTED',
        ipAddress,
        userAgent,
        details: JSON.stringify({ 
          agreedTo: 'Termos de Uso e Isenção de Responsabilidade',
          timestamp: new Date().toISOString()
        })
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
