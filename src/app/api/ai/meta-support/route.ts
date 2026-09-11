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
      return NextResponse.json({ error: 'IA não configurada via painel ou .env' }, { status: 400 })
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
            content: 'Você é um Especialista Sênior em Anúncios e Resolução de Problemas no Facebook Ads. Auxilie com base nas melhores práticas, regras e diretrizes técnicas de anúncios. Responda exclusivamente com base nas documentações oficiais da Meta.'
          },
          ...messages
        ]
      })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json({ error: err?.error?.message || `Erro (${res.status})` }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json({ reply: data.choices?.[0]?.message?.content || '' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao comunicar com a IA' }, { status: 500 })
  }
}
