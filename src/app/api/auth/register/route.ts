import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// Simple in-memory / persistent mock user store for demonstration
// In production, this connects to SQLite / Prisma
const usersDatabase: Array<{ id: string; name: string; email: string; passwordHash: string; createdAt: string }> = [
  {
    id: 'user_demo',
    name: 'Demo User',
    email: 'demo@adpilot.ai',
    // hashed "demo123"
    passwordHash: '$2a$10$wE99Sj31xN8gqjN8qL7O6.BfC1lJ8l8aN9qXJ7qXJ7qXJ7qXJ7qXJ',
    createdAt: new Date().toISOString(),
  },
]

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 })
    }

    const emailClean = email.trim().toLowerCase()
    const existing = usersDatabase.find(u => u.email === emailClean)
    if (existing) {
      return NextResponse.json({ error: 'Este e-mail já está cadastrado' }, { status: 400 })
    }

    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    const newUser = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      email: emailClean,
      passwordHash,
      createdAt: new Date().toISOString(),
    }

    usersDatabase.push(newUser)

    // Token for session
    const token = `token_${Date.now()}_${Math.random().toString(36).substring(2)}`

    return NextResponse.json({
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        createdAt: newUser.createdAt,
      },
      token,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao realizar cadastro'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
