import { NextResponse } from 'next/server'
import { getModelsUrl, getAiAuthHeaders } from '@/lib/ai-helpers'

export async function POST(request: Request) {
  try {
    const { endpoint, apiKey } = await request.json()

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint da IA não configurado' }, { status: 400 })
    }

    const url = getModelsUrl(endpoint)
    const headers = getAiAuthHeaders(apiKey)

    const res = await fetch(url, { method: 'GET', headers })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json({ error: err?.error?.message || `Erro HTTP (${res.status}) ao buscar modelos em ${url}` }, { status: res.status })
    }

    const data = await res.json()
    const modelsList = (data.data || []).map((m: { id: string; name?: string }) => ({
      id: m.id,
      name: m.name || m.id,
    }))

    return NextResponse.json({ models: modelsList })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao listar modelos do OpenCode'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
