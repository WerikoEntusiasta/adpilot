import { NextResponse } from 'next/server'
import { validateCredentials, type FacebookConfig } from '@/lib/facebook'

export async function POST(request: Request) {
  try {
    const { accessToken, adAccountId } = await request.json()

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
