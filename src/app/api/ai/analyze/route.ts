import { NextResponse } from 'next/server'
import { getChatCompletionsUrl, getAiAuthHeaders } from '@/lib/ai-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { campaigns, endpoint, apiKey, model } = await request.json()

    let dbSettings = null
    if (!apiKey || apiKey === 'ENV_CONFIGURED' || !endpoint) {
      dbSettings = await prisma.globalSetting.findUnique({ where: { id: 'GLOBAL' } })
    }

    const finalEndpoint = (endpoint && endpoint !== 'https://api.openai.com/v1' ? endpoint : null) || process.env.OPENAI_API_BASE || process.env.OPENAI_BASE_URL || dbSettings?.aiEndpoint || 'https://api.openai.com/v1'
    const finalApiKey = (!apiKey || apiKey === 'ENV_CONFIGURED') ? (process.env.OPENAI_API_KEY || dbSettings?.aiApiKey) : apiKey
    const finalModel = (model && model !== 'opencode-zen' && model !== 'gpt-4o' ? model : null) || process.env.OPENAI_MODEL || dbSettings?.aiModel || 'gpt-4o'

    if (!finalApiKey) {
      return NextResponse.json({ error: 'IA não configurada via painel ou .env' }, { status: 400 })
    }

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({
        suggestions: [{
          id: 'no-data',
          type: 'warning',
          impact: 'high',
          title: 'Nenhuma campanha detectada',
          description: 'A IA identificou que não há campanhas ativas reais conectadas na conta.',
          action: { type: 'pause', description: 'Conecte sua conta do Facebook Ads nas configurações.' }
        }]
      })
    }

    const url = getChatCompletionsUrl(finalEndpoint)
    const headers = getAiAuthHeaders(finalApiKey, finalEndpoint)

    const systemPrompt = "Você é o AdPilot, Especialista Master em Meta Ads e Tráfego Pago. " +
      "Analise as métricas reais fornecidas (Gasto, Impressões, Cliques, CTR, CPC, Vendas, Leads). " +
      "Identifique gargalos, oportunidades de escala ou problemas de criativo e responda SOMENTE com um JSON válido no seguinte formato:\n" +
      JSON.stringify({
        suggestions: [
          {
            id: "sug_1",
            type: "improvement", // "improvement" | "warning" | "new_campaign" | "opportunity"
            impact: "high", // "high" | "medium" | "low"
            title: "Título da recomendação",
            description: "Explicação técnica e didática do motivo baseado nos dados reais.",
            metrics: { estimatedImprovement: "+20% ROAS" },
            action: {
              type: "increase_budget",
              description: "Ação prática recomendada para o gestor executar"
            }
          }
        ]
      }, null, 2);

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: finalModel,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: "Aqui estão as campanhas reais do usuário para análise:\n" + JSON.stringify(campaigns.slice(0, 10))
          }
        ],
        temperature: 0.3,
        max_tokens: 2500
      })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json({ error: err?.error?.message || ("Erro do servidor de IA (" + res.status + ")") }, { status: res.status })
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ''
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return NextResponse.json({ suggestions: parsed.suggestions || [] })
  } catch (error) {
    console.error('Erro no analyze:', error)
    return NextResponse.json({ error: 'Erro ao processar análise da IA' }, { status: 500 })
  }
}
