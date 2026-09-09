import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
    }

    // Update the user
    await prisma.user.update({
      where: { id: userId },
      data: {
        lgpdConsent: true,
        lgpdConsentDate: new Date()
      }
    })

    // Get IP and User-Agent
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'IP Desconhecido'
    const userAgent = request.headers.get('user-agent') || 'Desconhecido'

    // Log acceptance securely
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: 'USER_REGISTER_TERMS_ACCEPTED',
        ipAddress,
        userAgent,
        details: JSON.stringify({ 
          agreedTo: 'Termos de Uso e Isenção de Responsabilidade (Pós-Login)',
          source: 'dashboard_popup'
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error accepting terms:', error)
    return NextResponse.json({ error: 'Erro interno ao processar o aceite' }, { status: 500 })
  }
}
