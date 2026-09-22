import { NextResponse } from 'next/server'
import {
  getChatCompletionsUrl,
  getAiAuthHeaders,
  getResolvedAiConfig,
  parseAiCompletionResponse,
  extractStructuredAiSuggestions,
  unpackAndSanitizeSuggestions,
} from '@/lib/ai-helpers'
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

    const systemPrompt = "Você é o AdPilot, Especialista Master em Meta Ads e Gestão de Tráfego Pago.\n" +
      "Analise as métricas reais fornecidas (Gasto, Impressões, Cliques, CTR, CPC, Vendas, Leads, ROAS).\n" +
      "Gere exatamente entre 3 a 5 recomendações cirúrgicas e prioritárias. Seja ultra-direto, focado no ROI do cliente e explique em linguagem clara para o empresário.\n" +
      "Classifique o tipo como:\n" +
      "- 'critical': quando há dinheiro sendo perdido ou ROAS < 1.0 (Ação imediata)\n" +
      "- 'warning': gargalos de CTR baixo, landing page ou público cansado\n" +
      "- 'opportunity': campanhas que podem ser escaladas com segurança\n" +
      "- 'improvement': ajustes de orçamento ou criativos\n\n" +
      "Responda ESTRITAMENTE com um JSON válido no formato:\n" +
      JSON.stringify({
        suggestions: [
          {
            id: "sug_1",
            type: "critical", // "critical" | "warning" | "opportunity" | "improvement"
            impact: "high", // "high" | "medium" | "low"
            title: "Título direto da recomendação",
            description: "Diagnóstico claro em 2-3 frases explicando o que os números revelam.",
            metrics: { estimatedImprovement: "Evitar prejuízo de R$ 540/mês e buscar ROAS 2.0" },
            action: {
              type: "restructure_campaign",
              description: "Passo a passo prático do que fazer agora"
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
        max_tokens: 4000
      })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json({ error: err?.error?.message || ("Erro do servidor de IA (" + res.status + ")") }, { status: res.status })
    }

    const { content } = await parseAiCompletionResponse(res)
    
    // Extrai sugestões mesmo se a resposta tiver sofrido truncamento ou quebra de sintaxe
    const rawSuggestions = extractStructuredAiSuggestions(content)
    const sanitizedSuggestions = unpackAndSanitizeSuggestions(rawSuggestions)

    if (sanitizedSuggestions.length > 0) {
      return NextResponse.json({ suggestions: sanitizedSuggestions })
    }

    // Se o modelo retornou texto puramente descritivo (sem chaves nem JSON), formata como recomendação amigável
    if (content && content.trim().length > 15 && !content.includes('"suggestions"') && !content.trim().startsWith('{')) {
      const cleanProse = content.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim()
      return NextResponse.json({
        suggestions: [
          {
            id: 'sug_ai_analysis',
            type: 'improvement',
            impact: 'high',
            title: 'Diagnóstico Estratégico das Campanhas',
            description: cleanProse,
            metrics: { estimatedImprovement: 'Otimização de Performance' },
            action: {
              type: 'review_strategy',
              description: 'Revisar métricas e aplicar as diretrizes recomendadas'
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
