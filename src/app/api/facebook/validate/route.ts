import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateCredentials, type FacebookConfig } from '@/lib/facebook'

export async function POST(request: Request) {
  try {
    const { accessToken: clientToken, adAccountId, useAdminToken } = await request.json()

    let accessToken = clientToken

    if (useAdminToken) {
      const global = await prisma.globalSetting.findUnique({ where: { id: 'GLOBAL' } })
      if (!global || !global.fbAccessToken) {
        return NextResponse.json({ valid: false, error: 'O Administrador ainda não configurou um Token Global da Agência.' }, { status: 400 })
      }
      accessToken = global.fbAccessToken
    }

    if (!accessToken || !adAccountId) {
      return NextResponse.json({ valid: false, error: 'Access Token e Ad Account ID são obrigatórios' }, { status: 400 })
    }

    const cleanAccountId = adAccountId.trim().startsWith('act_') ? adAccountId.trim() : `act_${adAccountId.trim()}`
    const config: FacebookConfig = {
      accessToken: accessToken.trim(),
      adAccountId: cleanAccountId,
    }

    const result = await validateCredentials(config)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao conectar ao Facebook API'
    return NextResponse.json({ valid: false, error: message }, { status: 500 })
  }
}
