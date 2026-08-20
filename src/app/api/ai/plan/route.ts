import { NextResponse } from 'next/server'
import { getChatCompletionsUrl, getAiAuthHeaders } from '@/lib/ai-helpers'

export async function POST(request: Request) {
  try {
    const { briefing, endpoint, apiKey, model } = await request.json()

    if (!endpoint && !apiKey) {
      return NextResponse.json({ error: 'IA não configurada. Vá em Configurações.' }, { status: 400 })
    }

    const url = getChatCompletionsUrl(endpoint || 'https://api.openai.com/v1')
    const headers = getAiAuthHeaders(apiKey)

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model || 'opencode-zen',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em mídia paga e Facebook Ads. O usuário vai descrever o que deseja anunciar e você deve gerar um plano completo de campanha.

Responda SOMENTE com um JSON válido (sem markdown, sem codeblock) no seguinte formato:
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
    "customAudiences": "Descrição de públicos personalizados sugeridos"
  },
  "budget": {
    "type": "daily | lifetime",
    "amount": 100,
    "duration": 30,
    "reason": "Motivo do orçamento sugerido"
  },
  "ads": [
    {
      "name": "Nome do anúncio",
      "headline": "Headline do anúncio",
      "primaryText": "Texto principal que aparece acima da mídia",
      "description": "Descrição do link",
      "cta": "LEARN_MORE | SHOP_NOW | SIGN_UP | CONTACT_US | GET_OFFER | DOWNLOAD"
    }
  ],
  "strategy": "Explicação da estratégia geral em 2-3 frases",
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
      return NextResponse.json({ error: 'A IA não retornou um formato JSON válido.', raw: content }, { status: 422 })
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao comunicar com a IA' }, { status: 500 })
  }
}
