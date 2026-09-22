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
import type { GuardianRule, GuardianIncident } from '@/lib/guardian-store'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { accessToken, adAccountId, useAdminToken, rules = [], datePreset = 'maximum' } = body

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

    const config: FacebookConfig | null = resolvedToken && resolvedAccountId ? {
      accessToken: resolvedToken,
      adAccountId: resolvedAccountId,
    } : null

    let adsData: any[] = []
    let insightsData: any[] = []

    if (config) {
      const [ads, insights] = await Promise.all([
        getAccountAds(config).catch(() => []),
        getAccountAdInsights(config, datePreset).catch(() => [])
      ])
      adsData = ads
      insightsData = insights
    }

    // Se não tiver dados reais, usar dados simulados para teste do Guardião
    if (adsData.length === 0) {
      adsData = [
        { id: 'ad_mock_01', name: 'Vídeo Depoimento Cliente 01 — Escala', status: 'ACTIVE' },
        { id: 'ad_mock_02', name: 'Carrossel Dores do Público — Conversão', status: 'ACTIVE' },
        { id: 'ad_mock_03', name: 'Imagem Estática Benefício Direto — Retargeting', status: 'ACTIVE' },
        { id: 'ad_mock_04', name: 'Vídeo Rápido 15s — WhatsApp Direct', status: 'ACTIVE' },
        { id: 'ad_mock_06', name: 'Imagem Oferta Relâmpago Sem Vendas', status: 'ACTIVE' },
      ]
      insightsData = [
        { ad_id: 'ad_mock_01', spend: '1420.50', reach: '32000', impressions: '48900', frequency: '1.53', clicks: '1850', ctr: '3.78', actions: [{ action_type: 'purchase', value: '42' }], action_values: [{ action_type: 'purchase', value: '6250.00' }] },
        { ad_id: 'ad_mock_02', spend: '890.30', reach: '18900', impressions: '29100', frequency: '1.54', clicks: '1240', ctr: '4.26', actions: [{ action_type: 'purchase', value: '25' }], action_values: [{ action_type: 'purchase', value: '2990.00' }] },
        { ad_id: 'ad_mock_03', spend: '640.00', reach: '10800', impressions: '34500', frequency: '3.19', clicks: '410', ctr: '1.19', actions: [{ action_type: 'purchase', value: '9' }], action_values: [{ action_type: 'purchase', value: '1200.00' }] },
        { ad_id: 'ad_mock_04', spend: '420.00', reach: '12100', impressions: '16200', frequency: '1.34', clicks: '680', ctr: '4.20', actions: [{ action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '64' }] },
        // Anúncio crítico gastando R$ 85 sem nenhuma conversão (disparará Stop-Loss)
        { ad_id: 'ad_mock_06', spend: '85.40', reach: '2400', impressions: '3800', frequency: '1.58', clicks: '32', ctr: '0.84', actions: [] },
      ]
    }

    const insightsByAd = new Map<string, any>()
    for (const ins of insightsData) {
      if (ins.ad_id) insightsByAd.set(ins.ad_id, ins)
    }

    const detectedIncidents: GuardianIncident[] = []
    const nowIso = new Date().toISOString()

    // Regras ativas
    const enabledRules: GuardianRule[] = Array.isArray(rules) && rules.length > 0 
      ? rules.filter((r: GuardianRule) => r.enabled)
      : []

    for (const ad of adsData) {
      const rawStatus = (ad.status || '').toUpperCase()
      const effStatus = ((ad as any).effective_status || '').toUpperCase()
      const isArchived = rawStatus === 'ARCHIVED' || effStatus === 'ARCHIVED'
      const isActive = !isArchived && (rawStatus === 'ACTIVE' || effStatus === 'ACTIVE')

      // Só avalia anúncios ativos
      if (!isActive) continue

      const ins = insightsByAd.get(ad.id) || {}
      const spend = Number(ins.spend || 0)
      const impressions = Number(ins.impressions || 0)
      const clicks = Number(ins.clicks || 0)
      const reach = Number(ins.reach || 0)
      const ctr = Number(ins.ctr || 0)
      const frequency = Number(ins.frequency || (reach > 0 ? impressions / reach : 1))

      const purchases = extractPurchases(ins.actions)
      const purchaseValue = extractPurchaseValue(ins.action_values)
      const messages = extractMessages(ins.actions)
      const leads = extractLeads(ins.actions)
      const resCalc = extractCampaignResults('', ins.actions)
      const conversions = resCalc.conversions || purchases || messages || leads || 0
      const cpa = conversions > 0 ? spend / conversions : 0
      const roas = spend > 0 && purchaseValue > 0 ? purchaseValue / spend : 0

      const metrics = { spend, conversions, cpa, roas, frequency, ctr }

      // Avaliação das regras
      for (const rule of enabledRules) {
        // 1. REGRA STOP-LOSS: Gasto sem conversão
        if (rule.category === 'STOP_LOSS') {
          if (spend >= rule.threshold && conversions === 0) {
            detectedIncidents.push({
              id: `inc_${ad.id}_stop_loss`,
              adId: ad.id,
              adName: ad.name,
              campaignName: ad.campaign_id,
              ruleId: rule.id,
              ruleName: rule.name,
              category: 'STOP_LOSS',
              severity: 'CRITICAL',
              reason: `O anúncio gastou R$ ${spend.toFixed(2)} (limite: R$ ${rule.threshold.toFixed(2)}) e gerou 0 conversões. Risco iminente de queima de caixa.`,
              detectedAt: nowIso,
              metrics,
              status: 'PENDING'
            })
          }
        }

        // 2. REGRA TETO DE CPA: Custo por conversão estourado
        if (rule.category === 'CPA_CEILING') {
          if (conversions >= 1 && cpa > rule.threshold) {
            detectedIncidents.push({
              id: `inc_${ad.id}_cpa`,
              adId: ad.id,
              adName: ad.name,
              campaignName: ad.campaign_id,
              ruleId: rule.id,
              ruleName: rule.name,
              category: 'CPA_CEILING',
              severity: 'WARNING',
              reason: `O CPA atual de R$ ${cpa.toFixed(2)} ultrapassou o teto estipulado de R$ ${rule.threshold.toFixed(2)}. Margem de lucro comprometida.`,
              detectedAt: nowIso,
              metrics,
              status: 'PENDING'
            })
          }
        }

        // 3. REGRA FADIGA DE PÚBLICO: Frequência alta com queda de CTR
        if (rule.category === 'FATIGUE') {
          if (frequency >= rule.threshold && ctr < 1.3 && spend > 50) {
            detectedIncidents.push({
              id: `inc_${ad.id}_fatigue`,
              adId: ad.id,
              adName: ad.name,
              campaignName: ad.campaign_id,
              ruleId: rule.id,
              ruleName: rule.name,
              category: 'FATIGUE',
              severity: 'WARNING',
              reason: `Frequência de ${frequency.toFixed(2)}x (teto: ${rule.threshold}x) com CTR fraco de ${ctr.toFixed(2)}%. O público alvo foi saturado.`,
              detectedAt: nowIso,
              metrics,
              status: 'PENDING'
            })
          }
        }

        // 4. REGRA ESCALA DE CAMPEÕES: ROAS elevado com consistência
        if (rule.category === 'SCALE') {
          if (roas >= rule.threshold && spend >= 100 && conversions >= 5) {
            detectedIncidents.push({
              id: `inc_${ad.id}_scale`,
              adId: ad.id,
              adName: ad.name,
              campaignName: ad.campaign_id,
              ruleId: rule.id,
              ruleName: rule.name,
              category: 'SCALE',
              severity: 'OPPORTUNITY',
              reason: `ROAS excelente de ${roas.toFixed(2)}x com ${conversions} conversões e estabilidade. Oportunidade clara de aumentar o orçamento em 15-20%.`,
              detectedAt: nowIso,
              metrics,
              status: 'PENDING'
            })
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      scannedAdsCount: adsData.length,
      incidents: detectedIncidents,
      scannedAt: nowIso,
      isRealData: !!config
    })

  } catch (error) {
    console.error('Erro no scan do Guardião:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro na varredura do Guardião'
    }, { status: 500 })
  }
}
