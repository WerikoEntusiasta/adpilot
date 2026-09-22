import { NextResponse } from 'next/server'
import { getChatCompletionsUrl, getAiAuthHeaders, getResolvedAiConfig, parseAiCompletionResponse } from '@/lib/ai-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { campaigns, endpoint, apiKey, model } = await request.json()

    let dbSettings = null
    if (!apiKey || apiKey === 'ENV_CONFIGURED' || !endpoint) {
      dbSettings = await prisma.globalSetting.findUnique({ where: { id: 'GLOBAL' } })
    }

    const { endpoint: finalEndpoint, apiKey: finalApiKey, model: finalModel, isConfigured } = getResolvedAiConfig(endpoint, apiKey, model, dbSettings)

    if (!isConfigured) {
      return NextResponse.json({ error: 'IA não configurada via variáveis de ambiente (.env) ou painel' }, { status: 400 })
    }

    // Filtrar estritamente campanhas operacionais (campanhas arquivadas NUNCA servem de dados para a IA)
    const validCampaigns = Array.isArray(campaigns)
      ? campaigns.filter((c: any) => c.status !== 'ARCHIVED' && (c as any).effective_status !== 'ARCHIVED' && (c as any).effectiveStatus !== 'ARCHIVED')
      : []

    if (validCampaigns.length === 0) {
      return NextResponse.json({
        suggestions: [{
          id: 'no-data',
          type: 'warning',
          impact: 'high',
          title: 'Nenhuma campanha operacional detectada',
          description: 'A IA identificou que não há campanhas ativas ou pausadas na conta. Campanhas arquivadas são completamente desconsideradas para fins de análise e estratégia.',
          action: { type: 'pause', description: 'Crie ou ative campanhas no seu Gerenciador do Meta Ads.' }
        }]
      })
    }

    const url = getChatCompletionsUrl(finalEndpoint)
    const headers = getAiAuthHeaders(finalApiKey, finalEndpoint)

    const systemPrompt = "Você é o AdPilot, Especialista Master em Meta Ads e Tráfego Pago. " +
      "Analise as métricas reais fornecidas (Gasto, Impressões, Cliques, CTR, CPC, Vendas, Leads). " +
      "Identifique gargalos, oportunidades de escala ou problemas de criativo e responda SOMENTE com um JSON válido no seguinte formato:\n" +
      JSON.stringify({
        suggestions: [
          {
            id: "sug_1",
            type: "improvement", // "improvement" | "warning" | "new_campaign" | "opportunity"
            impact: "high", // "high" | "medium" | "low"
            title: "Título da recomendação",
            description: "Explicação técnica e didática do motivo baseado nos dados reais.",
            metrics: { estimatedImprovement: "+20% ROAS" },
            action: {
              type: "increase_budget",
              description: "Ação prática recomendada para o gestor executar"
            }
          }
        ]
      }, null, 2);

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
          {
            role: 'user',
            content: "Aqui estão as campanhas reais do usuário para análise (campanhas arquivadas foram excluídas):\n" + JSON.stringify(validCampaigns.slice(0, 10))
          }
        ],
        temperature: 0.3,
        max_tokens: 2500
      })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json({ error: err?.error?.message || ("Erro do servidor de IA (" + res.status + ")") }, { status: res.status })
    }

    const { content } = await parseAiCompletionResponse(res)
    
    let parsed: any = null
    try {
      const cleaned = content.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0])
        } catch {}
      }
    }

    if (parsed && Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
      return NextResponse.json({ suggestions: parsed.suggestions })
    }

    // Se o modelo retornou texto livre de análise sem o envelope JSON esperado, converte para sugestão estruturada
    if (content && content.trim().length > 10) {
      const sanitizedText = content.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim()
      return NextResponse.json({
        suggestions: [
          {
            id: 'sug_ai_analysis',
            type: 'improvement',
            impact: 'high',
            title: 'Diagnóstico das Campanhas por Especialista IA',
            description: sanitizedText,
            metrics: { estimatedImprovement: 'Otimização Estratégica' },
            action: {
              type: 'review_strategy',
              description: 'Revisar e implementar as diretrizes detalhadas pela IA'
            }
          }
        ]
      })
    }

    return NextResponse.json({ suggestions: [] })
  } catch (error) {
    console.error('Erro no analyze:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao processar análise da IA' }, { status: 500 })
  }
}
