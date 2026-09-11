import { NextResponse } from 'next/server'
import { getChatCompletionsUrl, getAiAuthHeaders } from '@/lib/ai-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { briefing, endpoint, apiKey, model, fbAccessToken } = await request.json()

    let dbSettings = null
    if (!apiKey || apiKey === 'ENV_CONFIGURED' || !endpoint) {
      dbSettings = await prisma.globalSetting.findUnique({ where: { id: 'GLOBAL' } })
    }

    const finalEndpoint = (endpoint && endpoint !== 'https://api.openai.com/v1' ? endpoint : null) || process.env.OPENAI_API_BASE || process.env.OPENAI_BASE_URL || dbSettings?.aiEndpoint || 'https://api.openai.com/v1'
    const finalApiKey = (!apiKey || apiKey === 'ENV_CONFIGURED') ? (process.env.OPENAI_API_KEY || dbSettings?.aiApiKey) : apiKey
    const finalModel = (model && model !== 'opencode-zen' && model !== 'gpt-4o' ? model : null) || process.env.OPENAI_MODEL || dbSettings?.aiModel || 'gpt-4o'
    const effectiveFbToken = fbAccessToken || dbSettings?.fbAccessToken

    if (!finalApiKey) {
      return NextResponse.json({ error: 'IA não configurada via painel ou .env' }, { status: 400 })
    }

    let realInterestsContext = ''
    if (effectiveFbToken) {
      try {
        const searchWords = briefing.split(' ').filter((w: string) => w.length > 3).slice(0, 3)
        const foundInterests: string[] = []

        for (const word of searchWords) {
          const fbRes = await fetch(`https://graph.facebook.com/v21.0/search?type=adinterest&q=${encodeURIComponent(word)}&access_token=${effectiveFbToken}&limit=5`)
          if (fbRes.ok) {
            const fbData = await fbRes.json()
            if (fbData.data && Array.isArray(fbData.data)) {
              fbData.data.forEach((item: any) => {
                if (item.name && !foundInterests.includes(item.name)) {
                  foundInterests.push(item.name)
                }
              })
            }
          }
        }

        if (foundInterests.length > 0) {
          realInterestsContext = `\n\n[INTERESSES REAIS DA API]: ${foundInterests.join(', ')}.`
        }
      } catch (e) {
        console.error(e)
      }
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
            content: `Você é o AdPilot, Especialista Senior em Meta Ads. Gere um JSON com a chave "plan" contendo campaignName, objective, objectiveReason, targeting, budget, ads, strategy, tips. Sugira apenas interesses reais.${realInterestsContext}`
          },
          {
            role: 'user',
            content: briefing
          }
        ],
        temperature: 0.5,
        max_tokens: 3000
      })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json({ error: err?.error?.message || `Erro (${res.status})` }, { status: res.status })
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ''
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return NextResponse.json({ plan: parsed.plan || parsed })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao comunicar com a IA' }, { status: 500 })
  }
}
