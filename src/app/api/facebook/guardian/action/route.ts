import { NextRequest, NextResponse } from 'next/server'
import { updateAdStatus, FacebookConfig } from '@/lib/facebook'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { accessToken, adAccountId, useAdminToken, adId, status = 'PAUSED' } = body

    if (!adId) {
      return NextResponse.json({ error: 'adId é obrigatório' }, { status: 400 })
    }

    let resolvedToken = accessToken
    let resolvedAccountId = adAccountId

    if (useAdminToken || !resolvedToken) {
      if (process.env.ADMIN_FACEBOOK_ACCESS_TOKEN) {
        resolvedToken = process.env.ADMIN_FACEBOOK_ACCESS_TOKEN
      }
      if (process.env.ADMIN_FACEBOOK_AD_ACCOUNT_ID) {
        resolvedAccountId = process.env.ADMIN_FACEBOOK_AD_ACCOUNT_ID
      }
    }

    if (!resolvedToken || !resolvedAccountId || adId.startsWith('ad_mock_')) {
      // Mock execution for demo mode
      return NextResponse.json({
        success: true,
        adId,
        newStatus: status,
        isRealData: false,
        message: `Anúncio ${status === 'PAUSED' ? 'pausado' : 'reativado'} com sucesso em modo de demonstração.`
      })
    }

    const config: FacebookConfig = {
      accessToken: resolvedToken,
      adAccountId: resolvedAccountId,
    }

    await updateAdStatus(adId, status, config)

    return NextResponse.json({
      success: true,
      adId,
      newStatus: status,
      isRealData: true,
      message: `Anúncio ${status === 'PAUSED' ? 'pausado' : 'reativado'} com sucesso diretamente na sua conta do Facebook Ads.`
    })
  } catch (error) {
    console.error('Erro na ação do Guardião:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Falha ao executar ação no anúncio'
    }, { status: 500 })
  }
}
