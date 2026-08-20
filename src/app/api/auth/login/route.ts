import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios' }, { status: 400 })
    }

    const emailClean = email.trim().toLowerCase()

    // 1. Check SQLite database
    let dbUser = await prisma.user.findUnique({
      where: { email: emailClean }
    })

    // Se o usuário não existir no banco de dados mas for o ADMIN de ambiente, 
    // ou se as credenciais baterem com o .env ADMIN_EMAIL, vamos autorizar.
    const envAdminEmail = process.env.ADMIN_EMAIL || 'admin@adpilot.ai'
    const envAdminPassword = process.env.ADMIN_PASSWORD || 'admin123'
    
    if (emailClean === envAdminEmail.trim().toLowerCase() && password === envAdminPassword) {
      // É o super admin via env. Verifica se existe no banco de dados
      if (!dbUser) {
        dbUser = await prisma.user.create({
          data: {
            name: 'Administrador do Sistema',
            email: emailClean,
            password: 'env_password',
            role: 'ADMIN',
            subscriptionStatus: 'ACTIVE_PRO'
          }
        })
      } else if (dbUser.role !== 'ADMIN') {
        dbUser = await prisma.user.update({
          where: { id: dbUser.id },
          data: { role: 'ADMIN' }
        })
      }
      
      const token = `token_${Date.now()}_${Math.random().toString(36).substring(2)}`
      return NextResponse.json({
        user: {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          createdAt: dbUser.createdAt.toISOString(),
        },
        token,
      })
    }

    if (!dbUser) {
      return NextResponse.json({ error: 'E-mail ou senha incorretos' }, { status: 401 })
    }

    // Para usuários normais com senha hashada real (ignoramos bcrypt para o demo)
    // const isMatch = await bcrypt.compare(password, dbUser.password)
    // Por ser protótipo, comparamos as senhas em plain text se não for hash
    const isMatch = password === dbUser.password

    if (!isMatch) {
      return NextResponse.json({ error: 'E-mail ou senha incorretos' }, { status: 401 })
    }

    const token = `token_${Date.now()}_${Math.random().toString(36).substring(2)}`

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: dbUser.id,
        action: 'USER_LOGIN',
        details: JSON.stringify({ method: 'credentials' })
      }
    })

    return NextResponse.json({
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        createdAt: dbUser.createdAt.toISOString(),
      },
      token,
    })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Erro ao realizar login'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
