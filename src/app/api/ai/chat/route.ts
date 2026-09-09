import { NextResponse } from 'next/server'
import { getChatCompletionsUrl, getAiAuthHeaders } from '@/lib/ai-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { messages, endpoint, apiKey, model } = await request.json()

    let dbSettings = null
    if (!endpoint && !apiKey && !process.env.OPENAI_API_KEY) {
      dbSettings = await prisma.globalSetting.findUnique({ where: { id: 'GLOBAL' } })
    }

    const finalEndpoint = endpoint || process.env.OPENAI_API_BASE || process.env.OPENAI_BASE_URL || dbSettings?.aiEndpoint || 'https://api.openai.com/v1'
    const finalApiKey = (!apiKey || apiKey === 'ENV_CONFIGURED') ? (process.env.OPENAI_API_KEY || dbSettings?.aiApiKey) : apiKey
    const finalModel = model || process.env.OPENAI_MODEL || dbSettings?.aiModel || 'gpt-4o'

    if (!finalApiKey) {
      return NextResponse.json({ error: 'Endpoint ou Chave de IA não configurados. Configure no painel ou .env' }, { status: 400 })
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
            content: `Você é o AdPilot AI Advisor, um especialista em tráfego pago e Facebook Ads.
Você ajuda a analisar campanhas, sugerir melhorias, planejar novas campanhas e otimizar resultados.
Responda sempre em português do Brasil, de forma direta e prática.
Use emojis com moderação para destacar pontos importantes.
Quando sugerir mudanças, seja específico com números e valores.`,
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
