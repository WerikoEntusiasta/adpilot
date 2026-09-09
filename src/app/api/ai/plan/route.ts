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
    const finalModel = (model && model !== 'opencode-zen' && model !== 'gpt-4o' ? model : null) || process.env.OPENAI_MODEL || dbSettings?.aiModel || 'gpt-4o' // Default to typical OpenAI or any user preferred model

    if (!finalApiKey) {
      return NextResponse.json({ error: 'IA nÃ£o configurada. Configure no painel ou via variÃ¡vel de ambiente OPENAI_API_KEY.' }, { status: 400 })
    }

    const url = getChatCompletionsUrl(finalEndpoint)
    const headers = getAiAuthHeaders(finalApiKey)

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: finalModel,
        messages: [
          {
            role: 'system',
            content: `VocÃª Ã© um especialista em mÃ­dia paga e Facebook Ads. O usuÃ¡rio vai descrever o que deseja anunciar e vocÃª deve gerar um plano completo de campanha.

Responda SOMENTE com um JSON vÃ¡lido (sem markdown, sem codeblock) no seguinte formato:
{
  "campaignName": "Nome sugerido da campanha",
  "objective": "OUTCOME_TRAFFIC | OUTCOME_SALES | OUTCOME_LEADS | OUTCOME_AWARENESS | OUTCOME_ENGAGEMENT",
  "objectiveReason": "Motivo da escolha do objetivo",
  "targeting": {
    "ageMin": 25,
    "ageMax": 55,
    "gender": "all | male | female",
    "locations": "Brasil",
    "interests": ["interesse1", "interesse2"],
    "customAudiences": "DescriÃ§Ã£o de pÃºblicos personalizados sugeridos"
  },
  "budget": {
    "type": "daily | lifetime",
    "amount": 100,
    "duration": 30,
    "reason": "Motivo do orÃ§amento sugerido"
  },
  "ads": [
    {
      "name": "Nome do anÃºncio",
      "headline": "Headline do anÃºncio",
      "primaryText": "Texto principal que aparece acima da mÃ­dia",
      "description": "DescriÃ§Ã£o do link",
      "cta": "LEARN_MORE | SHOP_NOW | SIGN_UP | CONTACT_US | GET_OFFER | DOWNLOAD"
    }
  ],
  "strategy": "ExplicaÃ§Ã£o da estratÃ©gia geral em 2-3 frases",
  "tips": ["Dica 1", "Dica 2"]
}`,
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
      return NextResponse.json({ error: err?.error?.message || `Erro do servidor de IA (${res.status})` }, { status: res.status })
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ''

    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const plan = JSON.parse(cleaned)
      return NextResponse.json({ plan })
    } catch {
      return NextResponse.json({ error: 'A IA nÃ£o retornou um formato JSON vÃ¡lido.', raw: content }, { status: 422 })
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao comunicar com a IA' }, { status: 500 })
  }
}
