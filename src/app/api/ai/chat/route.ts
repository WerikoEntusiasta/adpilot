import { NextResponse } from 'next/server'
import { getChatCompletionsUrl, getAiAuthHeaders, getResolvedAiConfig, parseAiCompletionResponse } from '@/lib/ai-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { messages, campaigns, endpoint, apiKey, model } = await request.json()

    let dbSettings = null
    if (!apiKey || apiKey === 'ENV_CONFIGURED' || !endpoint) {
      dbSettings = await prisma.globalSetting.findUnique({ where: { id: 'GLOBAL' } })
    }

    const { endpoint: finalEndpoint, apiKey: finalApiKey, model: finalModel, isConfigured } = getResolvedAiConfig(endpoint, apiKey, model, dbSettings)

    if (!isConfigured) {
      return NextResponse.json({ error: 'IA não configurada via variáveis de ambiente (.env) ou painel' }, { status: 400 })
    }

    let campaignsContext = ''
    if (campaigns && Array.isArray(campaigns) && campaigns.length > 0) {
      const summaryList = campaigns.map((c: any) => {
        const spend = typeof c.spend === 'number' ? 'R$ ' + c.spend.toFixed(2) : 'R$ ' + c.spend
        const cpc = typeof c.cpc === 'number' ? 'R$ ' + c.cpc.toFixed(2) : 'R$ ' + c.cpc
        const ctr = typeof c.ctr === 'number' ? c.ctr.toFixed(2) + '%' : c.ctr
        const sales = c.salesCount !== undefined ? c.salesCount : (c.conversions || 0)
        const leads = c.leadsCount !== undefined ? c.leadsCount : (c.messages || 0)
        const roas = c.roas ? c.roas + 'x' : '—'
        return '- Campanha: "' + c.name + '" | Status: ' + c.status + ' | Objetivo: ' + (c.objective || 'N/A') + ' | Gasto: ' + spend + ' | Impressões: ' + c.impressions + ' | Cliques: ' + c.clicks + ' | CTR: ' + ctr + ' | CPC: ' + cpc + ' | Vendas (Site): ' + sales + ' | Leads (Whats): ' + leads + ' | ROAS: ' + roas
      }).join('\n')

      campaignsContext = "\n\n[DADOS REAIS E ATUAIS DAS CAMPANHAS NO FACEBOOK ADS]:\n" + summaryList + "\n\nINSTRUÇÃO CRÍTICA: Você tem acesso aos dados reais acima! NUNCA peça dados, prints, orçamentos ou planilhas ao usuário. Responda DIRETAMENTE analisando e citando os nomes e números das campanhas acima."
    } else {
      campaignsContext = "\n\n[STATUS DA CONTA]: O usuário ainda não possui campanhas ativas carregadas no painel."
    }

    const systemPrompt = "Você é o AdPilot AI, Especialista Sênior em Tráfego Pago e Facebook Ads (Meta Ads). " +
      "Seja analítico, proativo, direto e didático. " +
      "Analise sempre as métricas reais fornecidas abaixo para diagnosticar a saúde das campanhas, sugerir otimizações de criativos, identificar campanhas de alta performance para escala e alertar sobre CPAs elevados ou CTRs baixos." +
      campaignsContext

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
            content: systemPrompt
          },
          ...messages
        ]
      })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json({ error: err?.error?.message || ("Erro do servidor de IA (" + res.status + ")") }, { status: res.status })
    }

    const { content } = await parseAiCompletionResponse(res)
    return NextResponse.json({ reply: content })
  } catch (error) {
    console.error('Erro no chat da IA:', error)
    return NextResponse.json({ error: 'Erro ao comunicar com a IA' }, { status: 500 })
  }
}
