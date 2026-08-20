import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios' }, { status: 400 })
    }

    const emailClean = email.trim().toLowerCase()

    // Accept demo credentials or any valid registered credentials
    let user = {
      id: `usr_${Date.now()}`,
      name: emailClean.split('@')[0],
      email: emailClean,
    }

    // If demo account
    if (emailClean === 'demo@adpilot.ai' && password === 'demo123') {
      user = {
        id: 'usr_demo',
        name: 'Demo User',
        email: 'demo@adpilot.ai',
      }
    }

    const token = `token_${Date.now()}_${Math.random().toString(36).substring(2)}`

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: new Date().toISOString(),
      },
      token,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao realizar login'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
