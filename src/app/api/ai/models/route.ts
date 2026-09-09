import { NextResponse } from 'next/server'
import { getModelsUrl, getAiAuthHeaders } from '@/lib/ai-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { endpoint, apiKey } = await request.json()

    let dbSettings = null
    if (!apiKey || apiKey === 'ENV_CONFIGURED' || !endpoint) {
      dbSettings = await prisma.globalSetting.findUnique({ where: { id: 'GLOBAL' } })
    }

    const finalEndpoint = (endpoint && endpoint !== 'https://api.openai.com/v1' ? endpoint : null) || process.env.OPENAI_API_BASE || process.env.OPENAI_BASE_URL || dbSettings?.aiEndpoint || 'https://api.openai.com/v1'
    const finalApiKey = (!apiKey || apiKey === 'ENV_CONFIGURED') ? (process.env.OPENAI_API_KEY || dbSettings?.aiApiKey) : apiKey

    if (!finalApiKey) {
      return NextResponse.json({ error: 'IA nÃ£o configurada via painel ou .env' }, { status: 400 })
    }

    const url = getModelsUrl(finalEndpoint)
    const headers = getAiAuthHeaders(finalApiKey)

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
