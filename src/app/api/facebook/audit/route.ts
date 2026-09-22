import { NextRequest, NextResponse } from 'next/server'
import {
  getCampaigns,
  getAccountAdSets,
  getAccountAds,
  getAccountAdInsights,
  extractPurchases,
  extractPurchaseValue,
  extractMessages,
  extractLeads,
  extractCampaignResults,
  FacebookConfig,
} from '@/lib/facebook'
import { prisma } from '@/lib/prisma'

export interface HealthPillar {
  id: string
  title: string
  score: number // 0-100
  weight: number
  status: 'PASS' | 'WARNING' | 'FAIL'
  summary: string
  description: string
  recommendation: string
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW'
  metrics?: Record<string, string | number>
}

export interface AuditChecklistItem {
  id: string
  category: string
  title: string
  status: 'PASS' | 'WARNING' | 'FAIL'
  priority: 'ALTA' | 'MÉDIA' | 'BAIXA'
  actionText: string
}

export interface AccountAuditReport {
  healthScore: number // 0-100
  grade: 'A' | 'B' | 'C' | 'D'
  statusText: string
  analyzedAt: string
  adAccountId: string
  isRealData: boolean
  totalSpendAnalyzed: number
  activeCampaignsCount: number
  activeAdSetsCount: number
  activeAdsCount: number
  estimatedMonthlyWaste: number
  learningLimitedCount: number
  creativeDiversityRatio: number // % videos
  pillars: HealthPillar[]
  checklist: AuditChecklistItem[]
}

const mockAuditReport: AccountAuditReport = {
  healthScore: 74,
  grade: 'B',
  statusText: 'Boa Saúde Geral — 2 Oportunidades de Otimização',
  analyzedAt: new Date().toISOString(),
  adAccountId: 'act_demo_123456',
  isRealData: false,
  totalSpendAnalyzed: 4850.00,
  activeCampaignsCount: 4,
  activeAdSetsCount: 9,
  activeAdsCount: 16,
  estimatedMonthlyWaste: 720.00,
  learningLimitedCount: 2,
  creativeDiversityRatio: 38,
  pillars: [
    {
      id: 'learning_phase',
      title: 'Aprendizado Algorítmico (Learning Limited)',
      score: 65,
      weight: 0.25,
      status: 'WARNING',
      summary: '2 conjuntos em Aprendizado Limitado detectados',
      description: 'O algoritmo do Meta precisa de ~50 eventos por semana para estabilizar a entrega. Dois conjuntos ativos não têm orçamento diário suficiente para sair do aprendizado, gerando CPMs 18% mais caros.',
      recommendation: 'Agrupe os conjuntos menores em um único público CBO ou aumente o orçamento diário para pelo menos 4x o CPA desejado.',
      impactLevel: 'HIGH',
      metrics: { 'Conjuntos Travados': '2 de 9', 'Impacto no CPM': '+18%' }
    },
    {
      id: 'budget_bleed',
      title: 'Ralo de Orçamento (Anúncios Sem Retorno)',
      score: 70,
      weight: 0.25,
      status: 'WARNING',
      summary: 'R$ 240,00 consumidos em criativos sem conversão',
      description: 'Foram detectados 3 anúncios que consumiram mais de 2.5x o CPA médio da conta nos últimos 7 dias sem registrar uma única venda ou lead qualificado.',
      recommendation: 'Pause imediatamente os anúncios com mais de R$ 75 de gasto e 0 conversões para realocar a verba nos 2 melhores criativos da conta.',
      impactLevel: 'HIGH',
      metrics: { 'Desperdício 7d': 'R$ 240,00', 'Anúncios Ineficientes': '3' }
    },
    {
      id: 'format_diversity',
      title: 'Diversidade de Formatos (Vídeo vs Imagem)',
      score: 82,
      weight: 0.20,
      status: 'PASS',
      summary: '38% do catálogo em formato Vídeo Reels/Stories',
      description: 'A conta possui um bom equilíbrio entre criativos estáticos e vídeos verticais (9:16), garantindo acesso a posicionamentos baratos no Instagram Reels e Stories.',
      recommendation: 'Produza mais 2 variações com ganchos diferentes nos primeiros 3 segundos para testar na próxima semana.',
      impactLevel: 'MEDIUM',
      metrics: { 'Proporção de Vídeos': '38%', 'Posicionamentos': 'Expandido' }
    },
    {
      id: 'budget_distribution',
      title: 'Distribuição Orçamentária (Regra 80/20)',
      score: 88,
      weight: 0.15,
      status: 'PASS',
      summary: '76% da verba concentrada nos criativos campeões',
      description: 'Excelente alocação de capital: a maior parte da verba diária está alocada nos anúncios com histórico comprovado de ROAS positivo.',
      recommendation: 'Mantenha a regra de escala progressiva de 20% a cada 3 dias nos conjuntos vencedores.',
      impactLevel: 'MEDIUM',
      metrics: { 'Verba em Campeões': '76%', 'Eficiência de Escala': 'Alta' }
    },
    {
      id: 'frequency_fatigue',
      title: 'Saturação de Público & Frequência',
      score: 70,
      weight: 0.15,
      status: 'WARNING',
      summary: 'Frequência média de 2.85x no público de retargeting',
      description: 'O anúncio de remarketing já foi exibido quase 3 vezes para cada usuário. A taxa de cliques (CTR) começou a demonstrar declínio de 15% na última semana.',
      recommendation: 'Atualize a oferta ou substitua a imagem do anúncio de retargeting para quebrar a cegueira de banner.',
      impactLevel: 'LOW',
      metrics: { 'Frequência Média': '2.85x', 'Queda de CTR': '-15%' }
    }
  ],
  checklist: [
    {
      id: 'chk_1',
      category: 'Estrutura',
      title: 'Consolidar os 2 conjuntos em Aprendizado Limitado',
      status: 'WARNING',
      priority: 'ALTA',
      actionText: 'Agrupar públicos para atingir 50 conversões/semana'
    },
    {
      id: 'chk_2',
      category: 'Economia',
      title: 'Pausar 3 anúncios que consumiram verba sem conversão',
      status: 'WARNING',
      priority: 'ALTA',
      actionText: 'Economize até R$ 240/semana ativando o Guardião Stop-Loss'
    },
    {
      id: 'chk_3',
      category: 'Criativos',
      title: 'Renovar criativo de retargeting (Frequência > 2.8x)',
      status: 'WARNING',
      priority: 'MÉDIA',
      actionText: 'Inserir novo criativo com depoimento ou prova social'
    },
    {
      id: 'chk_4',
      category: 'Escala',
      title: 'Escalar orçamento dos 2 criativos com ROAS > 3.0x',
      status: 'PASS',
      priority: 'MÉDIA',
      actionText: 'Aumentar orçamento em 20% mantendo o CPA monitorado'
    },
    {
      id: 'chk_5',
      category: 'Formatos',
      title: 'Manter biblioteca de Reels/Stories atualizada',
      status: 'PASS',
      priority: 'BAIXA',
      actionText: 'Formatos verticais com boa cobertura de inventário'
    }
  ]
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { accessToken: clientToken, adAccountId, useAdminToken, datePreset = 'maximum' } = body

    let resolvedToken = clientToken
    let resolvedAccountId = adAccountId

    if (useAdminToken || !resolvedToken) {
      const global = await prisma.globalSetting.findUnique({ where: { id: 'GLOBAL' } })
      if (global?.fbAccessToken) {
        resolvedToken = global.fbAccessToken
      }
    }

    if (!resolvedToken) {
      const userId = req.headers.get('X-User-Id')
      if (userId) {
        const userSettings = await prisma.userSettings.findUnique({ where: { userId } })
        if (userSettings?.fbAccessToken) {
          resolvedToken = userSettings.fbAccessToken
        }
        if (!resolvedAccountId && userSettings?.fbAdAccountId) {
          resolvedAccountId = userSettings.fbAdAccountId
        }
      }
    }

    if (!resolvedAccountId) {
      const global = await prisma.globalSetting.findUnique({ where: { id: 'GLOBAL' } })
      if (global?.fbAdAccountId) {
        resolvedAccountId = global.fbAdAccountId
      }
    }

    // Se não tiver credenciais, retorna o relatório de demonstração rico
    if (!resolvedToken || !resolvedAccountId) {
      return NextResponse.json(mockAuditReport)
    }

    const config: FacebookConfig = {
      accessToken: resolvedToken,
      adAccountId: resolvedAccountId,
    }

    // Buscar campanhas, adsets, anúncios e insights
    const [campaigns, adSets, ads, insights] = await Promise.all([
      getCampaigns(config).catch(() => []),
      getAccountAdSets(config).catch(() => []),
      getAccountAds(config).catch(() => []),
      getAccountAdInsights(config, datePreset).catch(() => []),
    ])

    // Filtrar estritamente campanhas, conjuntos e anúncios NÃO arquivados
    const activeCampaigns = campaigns.filter(c => c.status !== 'ARCHIVED' && (c as any).effective_status !== 'ARCHIVED')
    const operationalAdSets = adSets.filter(s => s.status !== 'ARCHIVED' && (s as any).effective_status !== 'ARCHIVED')
    const operationalAds = ads.filter(a => a.status !== 'ARCHIVED' && (a as any).effective_status !== 'ARCHIVED')

    if (operationalAds.length === 0) {
      return NextResponse.json(mockAuditReport)
    }

    // Mapa de insights por ad_id
    const insightsByAdId = new Map<string, any>()
    let totalSpend = 0
    let totalConversions = 0

    for (const ins of insights) {
      if (ins.ad_id) {
        insightsByAdId.set(ins.ad_id, ins)
        const spend = Number(ins.spend || 0)
        totalSpend += spend

        const p = extractPurchases(ins.actions)
        const m = extractMessages(ins.actions)
        const l = extractLeads(ins.actions)
        const res = extractCampaignResults('', ins.actions)
        totalConversions += (res.conversions || p || m || l || 0)
      }
    }

    const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 35.00

    // 1. ANÁLISE DE APRENDIZADO LIMITADO
    let learningLimitedCount = 0
    let totalActiveAdSets = operationalAdSets.filter(s => s.status === 'ACTIVE' || (s as any).effective_status?.includes('ACTIVE')).length
    if (totalActiveAdSets === 0) totalActiveAdSets = operationalAdSets.length

    for (const set of operationalAdSets) {
      const stage = (set as any).learning_stage_info?.status
      if (stage === 'LEARNING_LIMITED') {
        learningLimitedCount++
      }
    }

    const learningScore = learningLimitedCount === 0 ? 100 : learningLimitedCount <= 1 ? 75 : Math.max(30, 100 - learningLimitedCount * 25)
    const learningStatus: 'PASS' | 'WARNING' | 'FAIL' = learningScore >= 80 ? 'PASS' : learningScore >= 60 ? 'WARNING' : 'FAIL'

    // 2. ANÁLISE DE RALO DE ORÇAMENTO (BUDGET BLEED)
    let wastedSpend = 0
    let bleedAdsCount = 0

    for (const ad of operationalAds) {
      const ins = insightsByAdId.get(ad.id)
      if (ins) {
        const spend = Number(ins.spend || 0)
        const p = extractPurchases(ins.actions)
        const m = extractMessages(ins.actions)
        const l = extractLeads(ins.actions)
        const c = p + m + l
        if (spend > Math.max(60, avgCpa * 2) && c === 0) {
          wastedSpend += spend
          bleedAdsCount++
        }
      }
    }

    const bleedRatio = totalSpend > 0 ? wastedSpend / totalSpend : 0
    const bleedScore = bleedRatio === 0 ? 100 : bleedRatio < 0.08 ? 80 : bleedRatio < 0.18 ? 60 : 35
    const bleedStatus: 'PASS' | 'WARNING' | 'FAIL' = bleedScore >= 80 ? 'PASS' : bleedScore >= 60 ? 'WARNING' : 'FAIL'

    // 3. ANÁLISE DE DIVERSIDADE CRIATIVA (VÍDEOS VS IMAGENS)
    let videoCount = 0
    for (const ad of operationalAds) {
      const isVid = Boolean(
        ad.creative?.video_id ||
        (ad.creative as any)?.object_story_spec?.video_data ||
        (ad.name && /vídeo|video|reels|stories|tiktok|mp4/i.test(ad.name))
      )
      if (isVid) videoCount++
    }

    const videoRatio = operationalAds.length > 0 ? Math.round((videoCount / operationalAds.length) * 100) : 0
    const diversityScore = videoRatio >= 35 ? 95 : videoRatio >= 15 ? 75 : 45
    const diversityStatus: 'PASS' | 'WARNING' | 'FAIL' = diversityScore >= 80 ? 'PASS' : diversityScore >= 60 ? 'WARNING' : 'FAIL'

    // 4. DISTRIBUIÇÃO ORÇAMENTÁRIA (80/20)
    let topSpendersSpend = 0
    const sortedAds = [...operationalAds].sort((a, b) => {
      const spA = Number(insightsByAdId.get(a.id)?.spend || 0)
      const spB = Number(insightsByAdId.get(b.id)?.spend || 0)
      return spB - spA
    })
    const topCount = Math.max(1, Math.round(sortedAds.length * 0.2))
    for (let i = 0; i < topCount; i++) {
      topSpendersSpend += Number(insightsByAdId.get(sortedAds[i]?.id)?.spend || 0)
    }
    const topConcentration = totalSpend > 0 ? Math.round((topSpendersSpend / totalSpend) * 100) : 70
    const distributionScore = topConcentration >= 50 && topConcentration <= 85 ? 90 : 65
    const distributionStatus: 'PASS' | 'WARNING' | 'FAIL' = distributionScore >= 80 ? 'PASS' : 'WARNING'

    // 5. SATURAÇÃO DE PÚBLICO & FREQUÊNCIA
    let totalFreq = 0
    let countFreq = 0
    for (const ins of insights) {
      const f = Number(ins.frequency || 0)
      if (f > 0) {
        totalFreq += f
        countFreq++
      }
    }
    const avgFrequency = countFreq > 0 ? totalFreq / countFreq : 1.8
    const freqScore = avgFrequency < 2.2 ? 95 : avgFrequency < 3.2 ? 70 : 40
    const freqStatus: 'PASS' | 'WARNING' | 'FAIL' = freqScore >= 80 ? 'PASS' : freqScore >= 60 ? 'WARNING' : 'FAIL'

    // PONTUAÇÃO FINAL PONDERADA (0 a 100)
    const healthScore = Math.round(
      learningScore * 0.25 +
      bleedScore * 0.25 +
      diversityScore * 0.20 +
      distributionScore * 0.15 +
      freqScore * 0.15
    )

    const grade: 'A' | 'B' | 'C' | 'D' = healthScore >= 85 ? 'A' : healthScore >= 70 ? 'B' : healthScore >= 50 ? 'C' : 'D'
    const statusText =
      grade === 'A' ? 'Excelente Saúde Algorítmica — Conta Altamente Otimizada' :
      grade === 'B' ? 'Boa Performance — Alguns Gargalos Técnicos Identificados' :
      grade === 'C' ? 'Atenção Necessária — Queima de Verba em Andamento' :
      'Risco Crítico — Desperdício Elevado no Leilão do Meta'

    const estimatedMonthlyWaste = Math.round((wastedSpend / 7) * 30 + (learningLimitedCount * 180))

    const pillars: HealthPillar[] = [
      {
        id: 'learning_phase',
        title: 'Aprendizado Algorítmico (Learning Limited)',
        score: learningScore,
        weight: 0.25,
        status: learningStatus,
        summary: learningLimitedCount > 0 ? `${learningLimitedCount} conjuntos em Aprendizado Limitado` : 'Todos os conjuntos com entrega estável',
        description: learningLimitedCount > 0
          ? `${learningLimitedCount} conjunto(s) ativo(s) não estão gerando 50 conversões semanais, o que mantém o Meta no escuro e encarece o leilão.`
          : 'Excelente: o algoritmo do Meta está conseguindo dados suficientes para otimizar lances sem travamento.',
        recommendation: learningLimitedCount > 0
          ? 'Agrupe públicos pequenos ou aumente o orçamento diário em 30% para destravar a fase de aprendizado.'
          : 'Mantenha a estrutura atual para preservar a estabilidade dos lances.',
        impactLevel: 'HIGH',
        metrics: { 'Travados': `${learningLimitedCount} de ${totalActiveAdSets}`, 'Status': learningStatus === 'PASS' ? 'Estável' : 'Limitado' }
      },
      {
        id: 'budget_bleed',
        title: 'Ralo de Orçamento (Anúncios Sem Retorno)',
        score: bleedScore,
        weight: 0.25,
        status: bleedStatus,
        summary: bleedAdsCount > 0 ? `R$ ${wastedSpend.toFixed(2)} em ${bleedAdsCount} anúncios sem resultado` : 'Nenhum ralo crítico de verba detectado',
        description: bleedAdsCount > 0
          ? `Foram identificados ${bleedAdsCount} anúncios que consumiram verba relevante sem gerar conversões mensuradas.`
          : 'Todos os criativos com investimento expressivo estão trazendo resultados compatíveis.',
        recommendation: bleedAdsCount > 0
          ? 'Pause os criativos ineficientes ou ative as regras do Guardião AdPilot para corte automático de perdas.'
          : 'Monitore o CPA diário para manter a eficiência.',
        impactLevel: 'HIGH',
        metrics: { 'Gasto Ralo': `R$ ${wastedSpend.toFixed(2)}`, 'Criativos': bleedAdsCount }
      },
      {
        id: 'format_diversity',
        title: 'Diversidade de Formatos (Vídeo vs Imagem)',
        score: diversityScore,
        weight: 0.20,
        status: diversityStatus,
        summary: `${videoRatio}% dos anúncios em formato Vídeo`,
        description: videoRatio >= 35
          ? 'Ótima distribuição de mídia: você aproveita os feeds convencionais e os formatos mais baratos de Stories/Reels.'
          : 'Sua conta está dependente demais de imagens estáticas, perdendo oportunidades de escala no Instagram Reels.',
        recommendation: videoRatio >= 35
          ? 'Continue testando novos ganchos de abertura nos vídeos.'
          : 'Adicione pelo menos 2 novos criativos em vídeo vertical 9:16 nesta semana.',
        impactLevel: 'MEDIUM',
        metrics: { 'Vídeos': `${videoCount}`, 'Estáticos': `${operationalAds.length - videoCount}`, 'Taxa Vídeo': `${videoRatio}%` }
      },
      {
        id: 'budget_distribution',
        title: 'Distribuição Orçamentária (Regra 80/20)',
        score: distributionScore,
        weight: 0.15,
        status: distributionStatus,
        summary: `${topConcentration}% da verba concentrada nos maiores anúncios`,
        description: 'Verba concentrada de forma estratégica nos anúncios que mais tracionam, evitando pulverização excessiva de orçamento.',
        recommendation: 'Alavanque o orçamento dos conjuntos campeões aos poucos (+20% a cada 72 horas).',
        impactLevel: 'MEDIUM',
        metrics: { 'Concentração Top': `${topConcentration}%`, 'Equilíbrio': 'Saudável' }
      },
      {
        id: 'frequency_fatigue',
        title: 'Saturação de Público & Frequência',
        score: freqScore,
        weight: 0.15,
        status: freqStatus,
        summary: `Frequência média da conta em ${avgFrequency.toFixed(2)}x`,
        description: avgFrequency > 3.0
          ? 'Frequência elevada: o público está vendo os mesmos anúncios repetidamente, gerando saturação e aumento de CPA.'
          : 'Frequência saudável: a audiência ainda é nova e receptiva aos anúncios em veiculação.',
        recommendation: avgFrequency > 3.0
          ? 'Expanda os públicos de topo de funil ou alterne criativos no retargeting.'
          : 'Mantenha a veiculação e acompanhe a evolução do CTR.',
        impactLevel: 'LOW',
        metrics: { 'Frequência': `${avgFrequency.toFixed(2)}x`, 'Alerta': avgFrequency > 3.0 ? 'Saturando' : 'Controlada' }
      }
    ]

    const checklist: AuditChecklistItem[] = [
      ...(learningLimitedCount > 0 ? [{
        id: 'chk_learn',
        category: 'Algoritmo',
        title: `Corrigir ${learningLimitedCount} conjunto(s) em Aprendizado Limitado`,
        status: 'FAIL' as const,
        priority: 'ALTA' as const,
        actionText: 'Consolide públicos semelhantes para atingir 50 conversões por semana'
      }] : [{
        id: 'chk_learn_ok',
        category: 'Algoritmo',
        title: 'Fase de aprendizado estável nos conjuntos de anúncio',
        status: 'PASS' as const,
        priority: 'BAIXA' as const,
        actionText: 'Nenhum conjunto preso em aprendizado limitado'
      }]),

      ...(bleedAdsCount > 0 ? [{
        id: 'chk_bleed',
        category: 'Financeiro',
        title: `Pausar ${bleedAdsCount} anúncio(s) sem retorno (R$ ${wastedSpend.toFixed(2)})`,
        status: 'FAIL' as const,
        priority: 'ALTA' as const,
        actionText: 'Economize ativando o Guardião Stop-Loss no menu lateral'
      }] : [{
        id: 'chk_bleed_ok',
        category: 'Financeiro',
        title: 'Controle de verba sem anúncios zumbis detectados',
        status: 'PASS' as const,
        priority: 'BAIXA' as const,
        actionText: 'Nenhum anúncio gastando sem gerar conversão'
      }]),

      ...(videoRatio < 30 ? [{
        id: 'chk_video',
        category: 'Criativos',
        title: 'Subir anúncios em formato de vídeo vertical (Reels/Stories)',
        status: 'WARNING' as const,
        priority: 'MÉDIA' as const,
        actionText: 'Apenas ' + videoRatio + '% dos criativos são vídeos. Aumente para 40%+'
      }] : [{
        id: 'chk_video_ok',
        category: 'Criativos',
        title: 'Boa proporção de criativos em vídeo (' + videoRatio + '%)',
        status: 'PASS' as const,
        priority: 'BAIXA' as const,
        actionText: 'Explore o Reprodutor de Vídeo na Galeria de Criativos'
      }]),

      ...(avgFrequency > 3.0 ? [{
        id: 'chk_freq',
        category: 'Públicos',
        title: 'Renovar criativos devido a alta frequência (' + avgFrequency.toFixed(2) + 'x)',
        status: 'WARNING' as const,
        priority: 'MÉDIA' as const,
        actionText: 'Público saturando. Insira novas variações de anúncios'
      }] : [{
        id: 'chk_freq_ok',
        category: 'Públicos',
        title: 'Frequência de entrega saudável (' + avgFrequency.toFixed(2) + 'x)',
        status: 'PASS' as const,
        priority: 'BAIXA' as const,
        actionText: 'Audiência receptiva sem fadiga crítica'
      }])
    ]

    const report: AccountAuditReport = {
      healthScore,
      grade,
      statusText,
      analyzedAt: new Date().toISOString(),
      adAccountId: resolvedAccountId,
      isRealData: true,
      totalSpendAnalyzed: totalSpend,
      activeCampaignsCount: activeCampaigns.length,
      activeAdSetsCount: totalActiveAdSets,
      activeAdsCount: operationalAds.length,
      estimatedMonthlyWaste,
      learningLimitedCount,
      creativeDiversityRatio: videoRatio,
      pillars,
      checklist,
    }

    return NextResponse.json(report)
  } catch (err) {
    console.error('Erro na rota de auditoria:', err)
    return NextResponse.json(mockAuditReport)
  }
}
