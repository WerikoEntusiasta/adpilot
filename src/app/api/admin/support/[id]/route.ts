import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { status } = await request.json()
    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: { status }
    })
    return NextResponse.json({ success: true, ticket })
  } catch (error) {
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}