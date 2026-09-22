import { NextRequest, NextResponse } from 'next/server'
import {
  getAccountAds,
  getAccountAdInsights,
  extractCampaignResults,
  extractPurchases,
  extractPurchaseValue,
  extractMessages,
  extractLeads,
  FacebookConfig
} from '@/lib/facebook'

export interface CreativeItem {
  id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
  campaignId: string
  adsetId: string
  title: string
  body: string
  imageUrl?: string
  thumbnailUrl?: string
  videoUrl?: string
  videoId?: string
  isVideo?: boolean
  spend: number
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  cpm: number
  reach: number
  frequency: number
  purchases: number
  purchaseValue: number
  roas: number
  messages: number
  leads: number
  conversions: number
  cpa: number
  fatigueStatus: 'HEALTHY' | 'WARNING' | 'FATIGUED'
  fatigueScore: number // 0 a 100 (quanto maior, mais fadigado)
  fatigueReason: string
  recommendation: string
  badges: string[]
}

const mockCreatives: CreativeItem[] = [
  {
    id: 'ad_mock_01',
    name: 'Vídeo Depoimento Cliente 01 — Escala',
    status: 'ACTIVE',
    campaignId: 'camp_001',
    adsetId: 'adset_001',
    title: 'Como aumentei meu faturamento em 3x sem aumentar o tempo de trabalho',
    body: 'Descubra a metodologia validada por mais de 500 empresários. Toque no botão e comece hoje mesmo.',
    imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=90',
    thumbnailUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=90',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    isVideo: true,
    spend: 1420.50,
    impressions: 48900,
    clicks: 1850,
    ctr: 3.78,
    cpc: 0.77,
    cpm: 29.05,
    reach: 32000,
    frequency: 1.53,
    purchases: 42,
    purchaseValue: 6250.00,
    roas: 4.40,
    messages: 0,
    leads: 42,
    conversions: 42,
    cpa: 33.82,
    fatigueStatus: 'HEALTHY',
    fatigueScore: 18,
    fatigueReason: 'Frequência de 1.53x e CTR acima da média. Entrega altamente saudável.',
    recommendation: 'Criativo campeão com ROAS de 4.4x. Excelente candidato para escalar orçamento em 20%.',
    badges: ['🥇 #1 ROAS', '💎 Mais Conversões'],
  },
  {
    id: 'ad_mock_02',
    name: 'Carrossel Dores do Público — Conversão',
    status: 'ACTIVE',
    campaignId: 'camp_001',
    adsetId: 'adset_002',
    title: 'Pare de perder tempo com processos manuais',
    body: 'Deslize para o lado para ver o passo a passo completo da automação que mudou nosso jogo.',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=90',
    thumbnailUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=90',
    spend: 890.30,
    impressions: 29100,
    clicks: 1240,
    ctr: 4.26,
    cpc: 0.72,
    cpm: 30.59,
    reach: 18900,
    frequency: 1.54,
    purchases: 25,
    purchaseValue: 2990.00,
    roas: 3.36,
    messages: 0,
    leads: 25,
    conversions: 25,
    cpa: 35.61,
    fatigueStatus: 'HEALTHY',
    fatigueScore: 22,
    fatigueReason: 'CTR excelente de 4.26%. Boa receptividade da audiência.',
    recommendation: 'Mantenha em veiculação e teste variações na primeira imagem do carrossel.',
    badges: ['🔥 Mais Cliques'],
  },
  {
    id: 'ad_mock_03',
    name: 'Imagem Estática Benefício Direto — Retargeting',
    status: 'ACTIVE',
    campaignId: 'camp_002',
    adsetId: 'adset_003',
    title: 'Últimas horas com condição especial',
    body: 'Você visitou nosso site mas não concluiu sua inscrição. Garanta seu acesso exclusivo agora.',
    imageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=90',
    thumbnailUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=90',
    spend: 640.00,
    impressions: 34500,
    clicks: 410,
    ctr: 1.19,
    cpc: 1.56,
    cpm: 18.55,
    reach: 10800,
    frequency: 3.19,
    purchases: 9,
    purchaseValue: 1200.00,
    roas: 1.88,
    messages: 0,
    leads: 9,
    conversions: 9,
    cpa: 71.11,
    fatigueStatus: 'WARNING',
    fatigueScore: 68,
    fatigueReason: 'Frequência de 3.19x no retargeting e CTR em declínio (1.19%).',
    recommendation: 'Audiência está saturando. Suba uma nova foto com chamada diferente ou renove a oferta.',
    badges: ['⚠️ Atenção à Fadiga'],
  },
  {
    id: 'ad_mock_04',
    name: 'Vídeo Rápido 15s — WhatsApp Direct',
    status: 'ACTIVE',
    campaignId: 'camp_003',
    adsetId: 'adset_004',
    title: 'Fale diretamente com nosso especialista no WhatsApp',
    body: 'Tire suas dúvidas em tempo real e receba uma demonstração gratuita sem compromisso.',
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=90',
    thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=90',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    isVideo: true,
    spend: 420.00,
    impressions: 16200,
    clicks: 680,
    ctr: 4.20,
    cpc: 0.62,
    cpm: 25.92,
    reach: 12100,
    frequency: 1.34,
    purchases: 0,
    purchaseValue: 0,
    roas: 0,
    messages: 64,
    leads: 64,
    conversions: 64,
    cpa: 6.56,
    fatigueStatus: 'HEALTHY',
    fatigueScore: 12,
    fatigueReason: 'Custo por conversa de R$ 6,56 com excelente engajamento.',
    recommendation: 'Excelente custo por lead. Pode ampliar o público para cidades vizinhas.',
    badges: ['🎯 Menor CPA', '💬 WhatsApp Campeão'],
  },
  {
    id: 'ad_mock_05',
    name: 'Banner Promocional Antigo — Feed',
    status: 'PAUSED',
    campaignId: 'camp_001',
    adsetId: 'adset_001',
    title: 'Desconto imperdível de fim de semana',
    body: 'Aproveite enquanto durarem os estoques. Condição exclusiva para hoje.',
    imageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1200&q=90',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1200&q=90',
    spend: 950.00,
    impressions: 62000,
    clicks: 390,
    ctr: 0.63,
    cpc: 2.44,
    cpm: 15.32,
    reach: 14200,
    frequency: 4.37,
    purchases: 4,
    purchaseValue: 480.00,
    roas: 0.51,
    messages: 0,
    leads: 4,
    conversions: 4,
    cpa: 237.50,
    fatigueStatus: 'FATIGUED',
    fatigueScore: 92,
    fatigueReason: 'Frequência crítica de 4.37x com CTR de 0.63%. O anúncio saturou completamente.',
    recommendation: 'Criativo completamente esgotado. Mantenha pausado e substitua por novos conceitos.',
    badges: ['🔴 Criativo Fadigado'],
  },
]

// Cache em memória para alternância instantânea entre contas (TTL 60 segundos)
const creativesCache = new Map<string, { data: any; expiresAt: number }>()
const CREATIVES_CACHE_TTL = 60 * 1000

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { accessToken, adAccountId, useAdminToken, datePreset = 'maximum', refresh } = body

    let resolvedToken = accessToken
    let resolvedAccountId = adAccountId

    if (useAdminToken || !resolvedToken) {
      if (process.env.ADMIN_FACEBOOK_ACCESS_TOKEN) {
        resolvedToken = process.env.ADMIN_FACEBOOK_ACCESS_TOKEN
      }
      if (process.env.ADMIN_FACEBOOK_AD_ACCOUNT_ID) {
        resolvedAccountId = process.env.ADMIN_FACEBOOK_AD_ACCOUNT_ID
      }
    }

    if (!resolvedToken || !resolvedAccountId) {
      return NextResponse.json({
        creatives: mockCreatives,
        isRealData: false,
        source: 'mock',
        message: 'Utilizando dados de demonstração (conecte suas chaves do Facebook nas Configurações para dados reais).'
      })
    }

    const cacheKey = `${resolvedAccountId}_${datePreset}`
    if (!refresh) {
      const cached = creativesCache.get(cacheKey)
      if (cached && Date.now() < cached.expiresAt) {
        return NextResponse.json(cached.data)
      }
    }

    const config: FacebookConfig = {
      accessToken: resolvedToken,
      adAccountId: resolvedAccountId,
    }

    // 1. Buscar todos os anúncios da conta
    const [ads, insights] = await Promise.all([
      getAccountAds(config).catch(err => {
        console.warn('Erro ao buscar ads da conta:', err)
        return []
      }),
      getAccountAdInsights(config, datePreset).catch(err => {
        console.warn('Erro ao buscar ad insights:', err)
        return []
      })
    ])

    if (!ads || ads.length === 0) {
      return NextResponse.json({
        creatives: mockCreatives,
        isRealData: false,
        source: 'fallback_mock',
        message: 'Nenhum anúncio retornado pela API do Facebook. Exibindo criativos simulados.'
      })
    }

    // Mapa de insights por ad_id
    const insightsByAdId = new Map<string, any>()
    for (const ins of insights) {
      if (ins.ad_id) {
        insightsByAdId.set(ins.ad_id, ins)
      }
    }

    // Identificar e buscar fontes diretas de vídeo para anúncios em vídeo
    const videoMap = new Map<string, string>()
    const videoIdsToFetch: string[] = []
    for (const ad of ads) {
      const vid = ad.creative?.video_id || (ad.creative as any)?.object_story_spec?.video_data?.video_id
      if (vid && !videoIdsToFetch.includes(vid)) {
        videoIdsToFetch.push(vid)
      }
    }

    if (videoIdsToFetch.length > 0 && resolvedToken) {
      await Promise.allSettled(
        videoIdsToFetch.slice(0, 25).map(async (vid) => {
          try {
            const vRes = await fetch(`https://graph.facebook.com/v21.0/${vid}?fields=source,picture&access_token=${resolvedToken}`)
            const vData = await vRes.json()
            if (vData.source) {
              videoMap.set(vid, vData.source)
            }
          } catch (err) {
            console.warn(`Erro ao buscar vídeo do Facebook (${vid}):`, err)
          }
        })
      )
    }

    // Processar cada anúncio
    const processed: CreativeItem[] = ads.map(ad => {
      const ins = insightsByAdId.get(ad.id) || {}
      const spend = Number(ins.spend || 0)
      const impressions = Number(ins.impressions || 0)
      const clicks = Number(ins.clicks || 0)
      const reach = Number(ins.reach || 0)
      const ctr = Number(ins.ctr || 0)
      const cpc = Number(ins.cpc || 0)
      const cpm = Number(ins.cpm || 0)

      // Frequência real da API ou cálculo impressions / reach
      let frequency = Number(ins.frequency || 0)
      if (!frequency && reach > 0 && impressions > 0) {
        frequency = impressions / reach
      }
      if (!frequency) frequency = 1.0

      const purchases = extractPurchases(ins.actions)
      const purchaseValue = extractPurchaseValue(ins.action_values)
      const messages = extractMessages(ins.actions)
      const leads = extractLeads(ins.actions)

      const resultCalc = extractCampaignResults('', ins.actions)
      const conversions = resultCalc.conversions || purchases || messages || leads || 0
      const cpa = conversions > 0 ? spend / conversions : 0
      const roas = spend > 0 && purchaseValue > 0 ? purchaseValue / spend : 0

      // Análise Matemática de Fadiga
      let fatigueStatus: 'HEALTHY' | 'WARNING' | 'FATIGUED' = 'HEALTHY'
      let fatigueScore = 15
      let fatigueReason = 'Frequência controlada e entrega de anúncios saudável.'
      let recommendation = 'Mantenha o anúncio em veiculação e monitore os custos diários.'

      if (frequency >= 3.5 || (frequency >= 2.8 && ctr < 1.0 && spend > 100)) {
        fatigueStatus = 'FATIGUED'
        fatigueScore = Math.min(95, Math.round(50 + frequency * 10))
        fatigueReason = `Frequência alta de ${frequency.toFixed(2)}x com queda de engajamento (CTR ${ctr.toFixed(2)}%). O público foi exposto repetidamente.`
        recommendation = 'Troque a imagem/vídeo ou expanda o tamanho da audiência imediatamente para evitar desperdício de verba.'
      } else if (frequency >= 2.2 || (frequency >= 1.8 && ctr < 1.4 && spend > 50)) {
        fatigueStatus = 'WARNING'
        fatigueScore = Math.min(65, Math.round(30 + frequency * 12))
        fatigueReason = `Frequência moderada de ${frequency.toFixed(2)}x. Sinais iniciais de saturação de audiência.`
        recommendation = 'Prepare novas variações de criativo para rodar quando o CTR cair ainda mais.'
      }

      const rawStatus = (ad.status || '').toUpperCase().trim()
      const effStatus = ((ad as any).effective_status || '').toUpperCase().trim()
      const isArchived = rawStatus === 'ARCHIVED' || effStatus === 'ARCHIVED' || effStatus === 'DELETED'
      const isActive = !isArchived && (
        rawStatus === 'ACTIVE' ||
        effStatus === 'ACTIVE' ||
        effStatus === 'IN_PROCESS' ||
        effStatus === 'PENDING_REVIEW' ||
        effStatus === 'WITH_ISSUES' ||
        effStatus === 'PREAPPROVED' ||
        effStatus === 'SCHEDULED' ||
        effStatus.includes('ACTIVE')
      )
      const status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' = isArchived ? 'ARCHIVED' : isActive ? 'ACTIVE' : 'PAUSED'

      const videoId = ad.creative?.video_id || (ad.creative as any)?.object_story_spec?.video_data?.video_id || undefined
      const directVideoUrl = videoId ? videoMap.get(videoId) : undefined
      const isVideo = Boolean(
        directVideoUrl ||
        videoId ||
        (ad.creative as any)?.object_story_spec?.video_data ||
        (ad.name && /vídeo|video|reels|stories|tiktok|mp4/i.test(ad.name))
      )

      const bestImage =
        ad.creative?.image_url ||
        (ad.creative as any)?.object_story_spec?.link_data?.picture ||
        (ad.creative as any)?.object_story_spec?.video_data?.image_url ||
        ad.creative?.thumbnail_url ||
        undefined

      return {
        id: ad.id,
        name: ad.name,
        status,
        campaignId: ad.campaign_id,
        adsetId: ad.adset_id,
        title: ad.creative?.title || ad.creative?.name || ad.name,
        body: ad.creative?.body || 'Anúncio publicado na conta do Meta Ads.',
        imageUrl: bestImage,
        thumbnailUrl: bestImage,
        videoUrl: directVideoUrl,
        videoId,
        isVideo,
        spend,
        impressions,
        clicks,
        ctr,
        cpc,
        cpm,
        reach,
        frequency,
        purchases,
        purchaseValue,
        roas,
        messages,
        leads,
        conversions,
        cpa,
        fatigueStatus,
        fatigueScore,
        fatigueReason,
        recommendation,
        badges: []
      }
    })

    // Calcular Badges de Campeões
    if (processed.length > 0) {
      // #1 ROAS
      const sortedByRoas = [...processed].filter(c => c.roas > 0).sort((a, b) => b.roas - a.roas)
      if (sortedByRoas.length > 0) {
        sortedByRoas[0].badges.push('🥇 #1 ROAS')
      }

      // Mais Cliques
      const sortedByClicks = [...processed].filter(c => c.clicks > 0).sort((a, b) => b.clicks - a.clicks)
      if (sortedByClicks.length > 0 && !sortedByClicks[0].badges.includes('🥇 #1 ROAS')) {
        sortedByClicks[0].badges.push('🔥 Mais Cliques')
      }

      // Menor CPA
      const sortedByCpa = [...processed].filter(c => c.conversions >= 2 && c.cpa > 0).sort((a, b) => a.cpa - b.cpa)
      if (sortedByCpa.length > 0 && !sortedByCpa[0].badges.includes('🥇 #1 ROAS')) {
        sortedByCpa[0].badges.push('🎯 Menor CPA')
      }

      // Mais Conversões
      const sortedByConv = [...processed].filter(c => c.conversions > 0).sort((a, b) => b.conversions - a.conversions)
      if (sortedByConv.length > 0 && !sortedByConv[0].badges.includes('💎 Mais Conversões')) {
        sortedByConv[0].badges.push('💎 Mais Conversões')
      }

      // Badges de Fadiga
      for (const item of processed) {
        if (item.fatigueStatus === 'FATIGUED') {
          item.badges.push('🔴 Fadigado')
        } else if (item.fatigueStatus === 'WARNING') {
          item.badges.push('⚠️ Atenção')
        }
      }
    }

    const responsePayload = {
      creatives: processed,
      isRealData: true,
      source: 'facebook_api',
      total: processed.length
    }
    creativesCache.set(cacheKey, { data: responsePayload, expiresAt: Date.now() + CREATIVES_CACHE_TTL })

    return NextResponse.json(responsePayload)

  } catch (error) {
    console.error('Erro na rota /api/facebook/creatives:', error)
    return NextResponse.json({
      creatives: mockCreatives,
      isRealData: false,
      source: 'error_fallback',
      error: error instanceof Error ? error.message : 'Erro ao processar criativos'
    })
  }
}
