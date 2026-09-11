import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getAdSetsByCampaign,
  getAdsByCampaign,
  getAdSetInsights,
  getAdInsights,
  extractCampaignResults,
  type FacebookConfig,
} from '@/lib/facebook'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const { accessToken: clientToken, adAccountId, useAdminToken, datePreset } = await request.json()

    let accessToken = clientToken

    if (useAdminToken) {
      const global = await prisma.globalSetting.findUnique({ where: { id: 'GLOBAL' } })
      if (!global || !global.fbAccessToken) {
        return NextResponse.json({ error: 'Token Global da Agência não configurado.' }, { status: 400 })
      }
      accessToken = global.fbAccessToken
    }

    if (!accessToken || !adAccountId) {
      return NextResponse.json({ error: 'Credenciais do Facebook não informadas.' }, { status: 400 })
    }

    const config: FacebookConfig = { accessToken, adAccountId }

    // Buscar AdSets, Ads e Insights simultaneamente com tratamento de erro individual
    const [adSets, ads, adSetInsights, adInsights] = await Promise.all([
      getAdSetsByCampaign(campaignId, config).catch((e) => {
        console.error('Erro ao buscar adsets:', e)
        return []
      }),
      getAdsByCampaign(campaignId, config).catch((e) => {
        console.error('Erro ao buscar ads:', e)
        return []
      }),
      getAdSetInsights(campaignId, config, datePreset || 'last_30d').catch((e) => {
        console.error('Erro ao buscar adset insights:', e)
        return []
      }),
      getAdInsights(campaignId, config, datePreset || 'last_30d').catch((e) => {
        console.error('Erro ao buscar ad insights:', e)
        return []
      }),
    ])

    const adSetMap = new Map(adSetInsights.map((i) => [i.adset_id, i]))
    const adMap = new Map(adInsights.map((i) => [i.ad_id, i]))

    // Processar AdSets
    const processedAdSets = adSets.map((as) => {
      const insight = adSetMap.get(as.id)
      const spend = insight ? Number(insight.spend) || 0 : 0
      const clicks = insight ? Number(insight.clicks) || 0 : 0
      const impressions = insight ? Number(insight.impressions) || 0 : 0
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
      const cpc = clicks > 0 ? spend / clicks : 0

      const results = extractCampaignResults('', insight?.actions)

      return {
        id: as.id,
        name: as.name,
        status: as.status,
        dailyBudget: as.daily_budget ? Number(as.daily_budget) / 100 : 0,
        spend,
        clicks,
        impressions,
        ctr,
        cpc,
        results: results.conversions,
        resultLabel: results.resultLabel,
        isSale: results.isSale,
        isLead: results.isLead,
        salesCount: results.salesCount,
        leadsCount: results.leadsCount,
      }
    })

    // Processar Ads & Criativos com extração de thumbnail inteligente
    const processedAds = ads.map((ad: any) => {
      const insight = adMap.get(ad.id)
      const spend = insight ? Number(insight.spend) || 0 : 0
      const clicks = insight ? Number(insight.clicks) || 0 : 0
      const impressions = insight ? Number(insight.impressions) || 0 : 0
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
      const cpc = clicks > 0 ? spend / clicks : 0

      const results = extractCampaignResults('', insight?.actions)

      // Extração resiliente de imagem do criativo
      const cr = ad.creative || {}
      const imageUrl = cr.image_url || 
                       cr.thumbnail_url || 
                       cr.object_story_spec?.link_data?.picture || 
                       cr.object_story_spec?.video_data?.image_url || 
                       cr.asset_feed_spec?.images?.[0]?.url || 
                       null

      return {
        id: ad.id,
        name: ad.name,
        status: ad.status,
        adsetId: ad.adset_id,
        creative: {
          id: cr.id,
          name: cr.name,
          title: cr.title,
          body: cr.body,
          image_url: imageUrl,
          thumbnail_url: imageUrl
        },
        spend,
        clicks,
        impressions,
        ctr,
        cpc,
        results: results.conversions,
        resultLabel: results.resultLabel,
        isSale: results.isSale,
        isLead: results.isLead,
        salesCount: results.salesCount,
        leadsCount: results.leadsCount,
      }
    })

    return NextResponse.json({
      adSets: processedAdSets,
      ads: processedAds,
    })
  } catch (error) {
    console.error('Erro na rota de detalhes da campanha:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Erro ao carregar detalhes',
    }, { status: 500 })
  }
}
