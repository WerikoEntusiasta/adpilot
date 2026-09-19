import { NextResponse } from 'next/server'
import { getChatCompletionsUrl, getAiAuthHeaders, getResolvedAiConfig, parseAiCompletionResponse } from '@/lib/ai-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { endpoint, apiKey, model } = await request.json()

    let dbSettings = null
    if (!apiKey || apiKey === 'ENV_CONFIGURED' || !endpoint) {
      dbSettings = await prisma.globalSetting.findUnique({ where: { id: 'GLOBAL' } })
    }

    const { endpoint: finalEndpoint, apiKey: finalApiKey, model: finalModel, isConfigured } = getResolvedAiConfig(endpoint, apiKey, model, dbSettings)

    if (!isConfigured) {
      return NextResponse.json({ valid: false, error: 'IA não configurada via variáveis de ambiente (.env) ou painel' }, { status: 400 })
    }

    const url = getChatCompletionsUrl(finalEndpoint)
    const headers = getAiAuthHeaders(finalApiKey, finalEndpoint)

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: finalModel,
        stream: false,
        messages: [{ role: 'user', content: 'Diga OK' }],
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const statusText = res.status === 429
        ? 'Erro 429 (Limite de requisições / Cota excedida no provedor OpenCode)'
        : res.status === 404
        ? `Erro 404 (Rota ou modelo "${finalModel}" não encontrado em ${url})`
        : res.status === 401
        ? 'Erro 401 (API Key não autorizada pelo provedor)'
        : (err?.error?.message || err?.message || `Erro HTTP ${res.status}: ${res.statusText}`)

      return NextResponse.json({ valid: false, error: statusText }, { status: res.status })
    }

    const { content } = await parseAiCompletionResponse(res)
    const responseText = content || 'OK'

    return NextResponse.json({ valid: true, response: responseText })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao validar conexão de IA'
    return NextResponse.json({ valid: false, error: message }, { status: 500 })
  }
}
