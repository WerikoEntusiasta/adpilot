import { NextResponse } from 'next/server'
import { getChatCompletionsUrl, getAiAuthHeaders } from '@/lib/ai-helpers'

export async function POST(request: Request) {
  try {
    const { endpoint, apiKey, model } = await request.json()

    if (!endpoint) {
      return NextResponse.json({ valid: false, error: 'Endpoint da IA não configurado' }, { status: 400 })
    }

    const url = getChatCompletionsUrl(endpoint)
    const headers = getAiAuthHeaders(apiKey)

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model || 'opencode-zen',
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
