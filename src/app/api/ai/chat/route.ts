import { NextResponse } from 'next/server'
import { getChatCompletionsUrl, getAiAuthHeaders } from '@/lib/ai-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { messages, endpoint, apiKey, model } = await request.json()

    let dbSettings = null
    if (!apiKey || apiKey === 'ENV_CONFIGURED' || !endpoint) {
      dbSettings = await prisma.globalSetting.findUnique({ where: { id: 'GLOBAL' } })
    }

    const finalEndpoint = (endpoint && endpoint !== 'https://api.openai.com/v1' ? endpoint : null) || process.env.OPENAI_API_BASE || process.env.OPENAI_BASE_URL || dbSettings?.aiEndpoint || 'https://api.openai.com/v1'
    const finalApiKey = (!apiKey || apiKey === 'ENV_CONFIGURED') ? (process.env.OPENAI_API_KEY || dbSettings?.aiApiKey) : apiKey
    const finalModel = (model && model !== 'opencode-zen' && model !== 'gpt-4o' ? model : null) || process.env.OPENAI_MODEL || dbSettings?.aiModel || 'gpt-4o'

    if (!finalApiKey) {
      return NextResponse.json({ error: 'Endpoint ou Chave de IA nÃ£o configurados. Configure no painel ou .env' }, { status: 400 })
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
            content: `VocÃª Ã© o AdPilot AI Advisor, um especialista em trÃ¡fego pago e Facebook Ads.
VocÃª ajuda a analisar campanhas, sugerir melhorias, planejar novas campanhas e otimizar resultados.
Responda sempre em portuguÃªs do Brasil, de forma direta e prÃ¡tica.
Use emojis com moderaÃ§Ã£o para destacar pontos importantes.
Quando sugerir mudanÃ§as, seja especÃ­fico com nÃºmeros e valores.`,
          },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const msg = err?.error?.message || `Erro do servidor de IA (${res.status}): ${res.statusText}`
      return NextResponse.json({ error: msg }, { status: res.status })
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || 'Sem resposta da IA.'

    return NextResponse.json({ content })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao conectar com o servidor de IA'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
