import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('X-User-Id')
    if (!userId) return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 })
    
    const settings = await prisma.userSettings.findUnique({
      where: { userId }
    })
    
    return NextResponse.json({ settings })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 })
  }
}import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('X-User-Id')
    if (!userId) return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 })
    
    const body = await request.json()
    
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: {
        ...(body.fbAccessToken !== undefined && { fbAccessToken: body.fbAccessToken }),
        ...(body.fbAdAccountId !== undefined && { fbAdAccountId: body.fbAdAccountId })
      },
      create: {
        userId,
        fbAccessToken: body.fbAccessToken,
        fbAdAccountId: body.fbAdAccountId
      }
    })
    
    return NextResponse.json({ success: true, settings })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao salvar configurações' }, { status: 500 })
  }
}
