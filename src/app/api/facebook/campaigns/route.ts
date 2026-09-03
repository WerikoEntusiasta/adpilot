import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getCampaigns,
  getCampaignInsights,
  getDailyInsights,
  extractMessages,
  extractLeads,
  extractPurchases,
  extractVideoViews,
  extractPurchaseValue,
  extractCampaignResults,
  type FacebookConfig,
} from '@/lib/facebook'

export async function POST(request: Request) {
  try {
    const { accessToken: clientToken, adAccountId, useAdminToken, datePreset } = await request.json()

    let accessToken = clientToken

    if (useAdminToken) {
      const global = await prisma.globalSetting.findUnique({ where: { id: 'GLOBAL' } })
      if (!global || !global.fbAccessToken) {
        return NextResponse.json({ error: 'O Administrador ainda não configurou um Token Global da Agência.' }, { status: 400 })
      }
      accessToken = global.fbAccessToken
    }

    if (!accessToken || !adAccountId) {
      return NextResponse.json({ error: 'Credenciais não configuradas' }, { status: 400 })
    }

    const config: FacebookConfig = { accessToken, adAccountId }

    const [campaigns, insights, daily] = await Promise.all([
      getCampaigns(config),
      getCampaignInsights(config, datePreset || 'last_30d'),
      getDailyInsights(config, datePreset || 'last_30d'),
    ])

    const insightMap = new Map(insights.map(i => [i.campaign_id, i]))

    const combined = campaigns.map(c => {
      const insight = insightMap.get(c.id)
      const spend = insight ? Number(insight.spend) || 0 : 0
      const impressions = insight ? Number(insight.impressions) || 0 : 0
      const clicks = insight ? Number(insight.clicks) || 0 : 0
      const reach = insight ? Number(insight.reach) || 0 : 0

      // Exact deduplicated metrics
      const messages = extractMessages(insight?.actions)
      const leads = extractLeads(insight?.actions)
      const purchases = extractPurchases(insight?.actions)
      const videoViews = extractVideoViews(insight?.actions)
      const purchaseValue = extractPurchaseValue(insight?.action_values)

      // Intelligent objective-based result extraction matching Meta Ads Manager Results column
      const { conversions, resultLabel } = extractCampaignResults(c.objective, insight?.actions)

      // Calculated rates
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : (insight ? Number(insight.ctr) || 0 : 0)
      const cpc = clicks > 0 ? spend / clicks : (insight ? Number(insight.cpc) || 0 : 0)
      const cpa = conversions > 0 && spend > 0 ? spend / conversions : 0
      const costPerMessage = messages > 0 && spend > 0 ? spend / messages : 0
      const costPerLead = leads > 0 && spend > 0 ? spend / leads : 0
      const roas = spend > 0 && purchaseValue > 0 ? purchaseValue / spend : 0

      return {
        id: c.id,
        name: c.name,
        status: c.status,
        objective: c.objective,
        dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : 0,
        spend,
        impressions,
        reach,
        clicks,
        ctr,
        cpc,
        conversions,
        resultLabel,
        messages,
        leads,
        purchases,
        videoViews,
        purchaseValue,
        cpa,
        costPerMessage,
        costPerLead,
        roas,
        startDate: c.start_time?.split('T')[0] || c.created_time?.split('T')[0] || '',
        endDate: c.stop_time?.split('T')[0] || null,
      }
    })

    const dailyMetrics = daily.map(d => ({
      date: d.date_start,
      spend: Number(d.spend) || 0,
      impressions: Number(d.impressions) || 0,
      clicks: Number(d.clicks) || 0,
      conversions: extractCampaignResults('', d.actions).conversions,
      messages: extractMessages(d.actions),
    }))

    return NextResponse.json({ campaigns: combined, dailyMetrics })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar dados'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
