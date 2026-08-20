import { NextResponse } from 'next/server'
import { getChatCompletionsUrl, getAiAuthHeaders } from '@/lib/ai-helpers'

export async function POST(request: Request) {
  try {
    const { campaigns, endpoint, apiKey, model } = await request.json()

    if (!endpoint && !apiKey) {
      return NextResponse.json({ error: 'IA não configurada' }, { status: 400 })
    }

    const url = getChatCompletionsUrl(endpoint || 'https://api.openai.com/v1')
    const headers = getAiAuthHeaders(apiKey)

    const prompt = `Analise o seguinte conjunto de campanhas do Facebook Ads e gere sugestões acionáveis em JSON:

Campanhas:
${JSON.stringify(campaigns, null, 2)}

Retorne um JSON com a lista de sugestões no formato:
{
  "suggestions": [
    {
      "id": "sug_1",
      "type": "improvement | warning | new_campaign | opportunity",
      "title": "Título curto",
      "description": "Explicação detalhada com métricas",
      "impact": "high | medium | low",
      "campaignName": "Nome da campanha se aplicável",
      "action": "Descrição da ação"
    }
  ]
}`

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model || 'opencode-zen',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Erro ao gerar análises com a IA' }, { status: res.status })
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ''
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return NextResponse.json({ suggestions: parsed.suggestions || [] })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro' }, { status: 500 })
  }
}
