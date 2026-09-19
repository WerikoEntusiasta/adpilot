import { NextResponse } from 'next/server'
import { getChatCompletionsUrl, getAiAuthHeaders, getResolvedAiConfig, parseAiCompletionResponse } from '@/lib/ai-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { messages, endpoint, apiKey, model } = await request.json()

    let dbSettings = null
    if (!apiKey || apiKey === 'ENV_CONFIGURED' || !endpoint) {
      dbSettings = await prisma.globalSetting.findUnique({ where: { id: 'GLOBAL' } })
    }

    const { endpoint: finalEndpoint, apiKey: finalApiKey, model: finalModel, isConfigured } = getResolvedAiConfig(endpoint, apiKey, model, dbSettings)

    if (!isConfigured) {
      return NextResponse.json({ error: 'IA não configurada via variáveis de ambiente (.env) ou painel' }, { status: 400 })
    }

    const url = getChatCompletionsUrl(finalEndpoint)
    const headers = getAiAuthHeaders(finalApiKey, finalEndpoint)

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: finalModel,
        stream: false,
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

    const { content } = await parseAiCompletionResponse(res)
    return NextResponse.json({ reply: content })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao comunicar com a IA' }, { status: 500 })
  }
}
