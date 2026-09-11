import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCampaigns, getCampaignInsights, extractCampaignResults, type FacebookConfig } from '@/lib/facebook'
import { getChatCompletionsUrl, getAiAuthHeaders } from '@/lib/ai-helpers'

// Endpoint executado diariamente às 12:00 pelo Vercel Cron ou agendador externo
export async function GET(request: Request) {
  try {
    const today = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()).split('/').reverse().join('-')

    // 1. Obter configurações globais da IA
    const globalSettings = await prisma.globalSetting.findUnique({ where: { id: 'GLOBAL' } })
    const endpoint = process.env.OPENAI_API_BASE || process.env.OPENAI_BASE_URL || globalSettings?.aiEndpoint || 'https://api.openai.com/v1'
    const apiKey = process.env.OPENAI_API_KEY || globalSettings?.aiApiKey
    const model = process.env.OPENAI_MODEL || globalSettings?.aiModel || 'gpt-4o'

    if (!apiKey) {
      return NextResponse.json({ error: 'IA não configurada no servidor' }, { status: 500 })
    }

    // 2. Buscar usuários que têm credenciais do Facebook configuradas
    const usersWithFb = await prisma.userSettings.findMany({
      where: {
        OR: [
          { fbAccessToken: { not: null } },
          { fbAdAccountId: { not: null } }
        ]
      },
      include: { user: true }
    })

    const results = []

    for (const uSetting of usersWithFb) {
      try {
        const token = uSetting.fbAccessToken || globalSettings?.fbAccessToken
        const adAccountId = uSetting.fbAdAccountId

        if (!token || !adAccountId) continue

        const config: FacebookConfig = { accessToken: token, adAccountId }
        const [campaigns, insights] = await Promise.all([
          getCampaigns(config).catch(() => []),
          getCampaignInsights(config, 'maximum').catch(() => [])
        ])

        const insightMap = new Map(insights.map(i => [i.campaign_id, i]))

        const activeCampaigns = campaigns
          .filter(c => c.status === 'ACTIVE')
          .map(c => {
            const insight = insightMap.get(c.id)
            const spend = insight ? Number(insight.spend) || 0 : 0
            const clicks = insight ? Number(insight.clicks) || 0 : 0
            const impressions = insight ? Number(insight.impressions) || 0 : 0
            const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
            const cpc = clicks > 0 ? spend / clicks : 0
            const res = extractCampaignResults(c.objective, insight?.actions)

            return {
              name: c.name,
              objective: c.objective,
              spend,
              clicks,
              impressions,
              ctr,
              cpc,
              salesCount: res.salesCount,
              leadsCount: res.leadsCount,
            }
          })

        if (activeCampaigns.length === 0) continue

        const systemPrompt = "Você é o AdPilot AI, Especialista Sênior em Tráfego Pago. " +
          "Gere 2 a 4 sugestões acionáveis para o relatório diário das 12:00 deste gestor com base nos dados reais abaixo. " +
          "Responda SOMENTE um JSON válido com { \"suggestions\": [{ \"id\": \"sug_1\", \"type\": \"improvement\", \"impact\": \"high\", \"title\": \"...\", \"description\": \"...\", \"action\": { \"type\": \"increase_budget\", \"description\": \"...\" } }] }";

        const url = getChatCompletionsUrl(endpoint)
        const headers = getAiAuthHeaders(apiKey, endpoint)

        const aiRes = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: "Campanhas do dia:\n" + JSON.stringify(activeCampaigns) }
            ],
            temperature: 0.3,
            max_tokens: 2000,
          })
        })

        if (aiRes.ok) {
          const aiData = await aiRes.json()
          const content = aiData.choices?.[0]?.message?.content || ''
          const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
          const parsed = JSON.parse(cleaned)

          if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
            await prisma.dailyAdvisorSuggestion.upsert({
              where: {
                userId_date: {
                  userId: uSetting.userId,
                  date: today,
                }
              },
              update: {
                suggestions: JSON.stringify(parsed.suggestions)
              },
              create: {
                userId: uSetting.userId,
                date: today,
                suggestions: JSON.stringify(parsed.suggestions)
              }
            })
            results.push({ userId: uSetting.userId, status: 'success', count: parsed.suggestions.length })
          }
        }
      } catch (err) {
        console.error('Erro ao processar cron para usuário', uSetting.userId, err)
      }
    }

    return NextResponse.json({
      success: true,
      date: today,
      processed: results.length,
      details: results
    })
  } catch (error) {
    console.error('Erro global no cron daily-advisor:', error)
    return NextResponse.json({ error: 'Erro no cron diário' }, { status: 500 })
  }
}
