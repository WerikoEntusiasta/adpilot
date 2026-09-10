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
      return NextResponse.json({ error: 'IA não configurada. Configure via variável de ambiente OPENAI_API_KEY.' }, { status: 400 })
    }

    const url = getChatCompletionsUrl(finalEndpoint)
    const headers = getAiAuthHeaders(finalApiKey, finalEndpoint)

    // Se o usuário não tiver campanhas REAIS conectadas, barrar a IA de inventar coisas
    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({
        suggestions: [{
          id: 'no-data',
          type: 'warning',
          impact: 'high',
          title: 'Nenhuma campanha detectada',
          description: 'A IA identificou que não há campanhas ativas reais conectadas na conta. Conecte sua conta do Facebook Ads ou ative uma campanha para receber análises.',
          action: { type: 'pause', description: 'Por favor, conecte a API do Facebook para dados reais.' }
        }]
      })
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: finalModel,
        messages: [
          {
            role: 'system',
            content: \Você é o AdPilot, um Desenvolvedor Senior / Especialista Master em Tráfego Pago e Facebook Ads (Meta Ads).
Sua missão é atuar como mentor para analistas mais juniores, explicando o "porquê" de cada sugestão com clareza e baseando-se nas últimas atualizações do algoritmo da Meta (Advantage+, CAPI, etc).
IMPORTANTE: 
1. Use APENAS os dados reais que foram fornecidos. NUNCA invente métricas, CPAs, nomes de campanhas ou resultados fictícios.
2. Seja didático, explique como a mudança vai afetar a campanha.

O usuário vai enviar um JSON com as campanhas ativas. Você deve retornar um JSON válido contendo um array 'suggestions' (1 a 4 itens focados em alto impacto).
Formato de saída:
{
  "suggestions": [
    {
      "id": "gerar-id-unico",
      "type": "improvement | warning | new_campaign | opportunity",
      "impact": "high | medium | low",
      "title": "Título claro e profissional",
      "description": "Explicação detalhada e didática do motivo da sugestão baseada em métricas REAIS lidas.",
      "metrics": { "estimatedImprovement": "+15% ROAS" },
      "action": {
        "type": "pause | increase_budget | decrease_budget | duplicate",
        "description": "Descrição clara da ação que o usuário deve tomar (ex: Aumentar orçamento diário de X para Y)"
      }
    }
  ]
}\,
          },
          {
            role: 'user',
            content: JSON.stringify(campaigns.slice(0, 10)), // Limitar para não estourar tokens
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json({ error: err?.error?.message || \Erro do servidor de IA (\)\ }, { status: res.status })
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ''

    try {
      const cleaned = content.replace(/\\\json\n?/g, '').replace(/\\\\n?/g, '').trim()
      const parsed = JSON.parse(cleaned)
      return NextResponse.json({ suggestions: parsed.suggestions || [] })
    } catch {
      return NextResponse.json({ error: 'A IA não retornou um formato JSON válido.' }, { status: 422 })
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro interno' }, { status: 500 })
  }
}
