import { NextResponse } from 'next/server'
import { getChatCompletionsUrl, getAiAuthHeaders } from '@/lib/ai-helpers'

export async function POST(request: Request) {
  try {
    const { endpoint, apiKey, model } = await request.json()

    const finalEndpoint = endpoint || process.env.OPENAI_API_BASE || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    const finalApiKey = (!apiKey || apiKey === 'ENV_CONFIGURED') ? process.env.OPENAI_API_KEY : apiKey
    const finalModel = model || process.env.OPENAI_MODEL || 'gpt-4o'

    if (!finalApiKey) {
      return NextResponse.json({ valid: false, error: 'IA não configurada via painel ou .env' }, { status: 400 })
    }

    const url = getChatCompletionsUrl(finalEndpoint)
    const headers = getAiAuthHeaders(finalApiKey)

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: finalModel,
        messages: [{ role: 'user', content: 'Diga OK' }],
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const statusText = res.status === 429
        ? 'Erro 429 (Limite de requisições / Cota excedida no provedor OpenCode)'
        : res.status === 404
        ? `Erro 404 (Rota ou modelo "${model}" não encontrado em ${url})`
        : res.status === 401
        ? 'Erro 401 (API Key não autorizada pelo provedor)'
        : (err?.error?.message || err?.message || `Erro HTTP ${res.status}: ${res.statusText}`)

      return NextResponse.json({ valid: false, error: statusText }, { status: res.status })
    }

    const data = await res.json()
    const responseText = data.choices?.[0]?.message?.content || 'OK'

    return NextResponse.json({ valid: true, response: responseText })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao validar conexão de IA'
    return NextResponse.json({ valid: false, error: message }, { status: 500 })
  }
}
