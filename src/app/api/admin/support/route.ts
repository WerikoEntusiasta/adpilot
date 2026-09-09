import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const tickets = await prisma.supportTicket.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ tickets })
  } catch (error) {
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}