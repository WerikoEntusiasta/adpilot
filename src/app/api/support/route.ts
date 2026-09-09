import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function getUserId(request: Request) {
  const auth = request.headers.get('Authorization')
  if (!auth) return null
  // In a real app, verify JWT. Here we just return dummy for now if using purely client store,
  // but wait! We need the userId. In our mock auth, the token doesn't contain the user ID.
  // We can ask the client to send the userId in a header.
  return null
}

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('X-User-Id')
    if (!userId) return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 })
    
    const tickets = await prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json({ tickets })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar chamados' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('X-User-Id')
    if (!userId) return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 })
    
    const { subject, message } = await request.json()
    
    if (!subject || !message) {
      return NextResponse.json({ error: 'Assunto e mensagem são obrigatórios' }, { status: 400 })
    }
    
    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        subject,
        message,
        status: 'OPEN'
      }
    })
    
    return NextResponse.json({ success: true, ticket })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar chamado' }, { status: 500 })
  }
}