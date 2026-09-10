import { NextResponse } from 'next/server'
import { getChatCompletionsUrl, getAiAuthHeaders } from '@/lib/ai-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { briefing, endpoint, apiKey, model } = await request.json()

    let dbSettings = null
    if (!apiKey || apiKey === 'ENV_CONFIGURED' || !endpoint) {
      dbSettings = await prisma.globalSetting.findUnique({ where: { id: 'GLOBAL' } })
    }

    const finalEndpoint = (endpoint && endpoint !== 'https://api.openai.com/v1' ? endpoint : null) || process.env.OPENAI_API_BASE || process.env.OPENAI_BASE_URL || dbSettings?.aiEndpoint || 'https://api.openai.com/v1'
    const finalApiKey = (!apiKey || apiKey === 'ENV_CONFIGURED') ? (process.env.OPENAI_API_KEY || dbSettings?.aiApiKey) : apiKey
    const finalModel = (model && model !== 'opencode-zen' && model !== 'gpt-4o' ? model : null) || process.env.OPENAI_MODEL || dbSettings?.aiModel || 'gpt-4o'

    if (!finalApiKey) {
      return NextResponse.json({ error: 'IA não configurada. Configure no painel ou via variável de ambiente OPENAI_API_KEY.' }, { status: 400 })
    }

    const url = getChatCompletionsUrl(finalEndpoint)
    const headers = getAiAuthHeaders(finalApiKey, finalEndpoint)

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: finalModel,
        messages: [
          {
            role: 'system',
            content: \Você é o AdPilot, um Desenvolvedor Senior / Especialista Master em Tráfego Pago e Facebook Ads (Meta Ads). 
Sua missão é dar sugestões com base nas ÚLTIMAS atualizações do algoritmo da Meta (ex: Campanhas Advantage+, CAPI, segmentação ampla, vídeos curtos).
IMPORTANTE:
1. Trabalhe SEMPRE com dados reais. Nunca invente ou crie informações fictícias.
2. Seja claro, didático e explique o 'porquê' das suas decisões para que até um iniciante ou Junior entenda o raciocínio por trás da estratégia.
3. O usuário vai descrever o que deseja anunciar. Gere um plano completo e moderno de campanha.

Responda SOMENTE com um JSON válido (sem markdown, sem codeblock) no seguinte formato:
{
  "campaignName": "Nome sugerido da campanha",
  "objective": "OUTCOME_TRAFFIC | OUTCOME_SALES | OUTCOME_LEADS | OUTCOME_AWARENESS | OUTCOME_ENGAGEMENT",
  "objectiveReason": "Explique de forma didática (para um Junior) por que escolheu este objetivo",
  "targeting": {
    "ageMin": 25,
    "ageMax": 55,
    "gender": "all | male | female",
    "locations": "Brasil",
    "interests": ["interesse1"],
    "customAudiences": "Explique os públicos Advantage+ ou similares"
  },
  "budget": {
    "type": "daily | lifetime",
    "amount": 100,
    "duration": 30,
    "reason": "Explique didaticamente o raciocínio do orçamento"
  },
  "ads": [
    {
      "name": "Nome do anúncio",
      "headline": "Headline do anúncio",
      "primaryText": "Texto principal focado em alta conversão atual",
      "description": "Descrição do link",
      "cta": "LEARN_MORE | SHOP_NOW | SIGN_UP"
    }
  ],
  "strategy": "Explicação técnica porém acessível da estratégia (como se ensinasse um Junior)",
  "tips": ["Dica prática 1", "Dica prática 2"]
}\,
          },
          {
            role: 'user',
            content: briefing,
          },
        ],
        temperature: 0.7,
        max_tokens: 3000,
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
      const plan = JSON.parse(cleaned)
      return NextResponse.json({ plan })
    } catch {
      return NextResponse.json({ error: 'A IA não retornou um formato JSON válido.', raw: content }, { status: 422 })
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao comunicar com a IA' }, { status: 500 })
  }
}
