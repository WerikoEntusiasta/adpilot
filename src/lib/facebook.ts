const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0'

export interface FacebookConfig {
  accessToken: string
  adAccountId: string
}

export interface FacebookCampaign {
  id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED'
  objective: string
  daily_budget?: string
  lifetime_budget?: string
  created_time: string
  start_time?: string
  stop_time?: string
}

export interface FacebookInsight {
  campaign_id: string
  campaign_name: string
  spend: string
  impressions: string
  clicks: string
  ctr: string
  cpc: string
  cpm: string
  reach: string
  actions?: Array<{ action_type: string; value: string }>
  action_values?: Array<{ action_type: string; value: string }>
  date_start: string
  date_stop: string
}

function normalizeAdAccountId(id: string): string {
  const trimmed = id.trim()
  return trimmed.startsWith('act_') ? trimmed : `act_${trimmed}`
}

async function fbFetch<T>(endpoint: string, config: FacebookConfig, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${GRAPH_API_BASE}${endpoint}`)
  url.searchParams.set('access_token', config.accessToken.trim())
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }

  const res = await fetch(url.toString())
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error?.error?.message || `Facebook API error (${res.status}): ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

// Buscar todas as campanhas da conta
export async function getCampaigns(config: FacebookConfig): Promise<FacebookCampaign[]> {
  const accountId = normalizeAdAccountId(config.adAccountId)
  const result = await fbFetch<{ data: FacebookCampaign[] }>(
    `/${accountId}/campaigns`,
    config,
    {
      fields: 'id,name,status,objective,daily_budget,lifetime_budget,created_time,start_time,stop_time',
      limit: '100',
    }
  )
  return result.data || []
}

// Buscar insights (métricas) das campanhas com action_values para ROAS exato
export async function getCampaignInsights(
  config: FacebookConfig,
  datePreset: string = 'last_30d'
): Promise<FacebookInsight[]> {
  const accountId = normalizeAdAccountId(config.adAccountId)
  const result = await fbFetch<{ data: FacebookInsight[] }>(
    `/${accountId}/insights`,
    config,
    {
      fields: 'campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,cpm,reach,actions,action_values',
      level: 'campaign',
      date_preset: datePreset,
      limit: '100',
    }
  )
  return result.data || []
}

// Buscar insights diários (para gráficos)
export async function getDailyInsights(
  config: FacebookConfig,
  datePreset: string = 'last_30d'
): Promise<FacebookInsight[]> {
  const accountId = normalizeAdAccountId(config.adAccountId)
  const result = await fbFetch<{ data: FacebookInsight[] }>(
    `/${accountId}/insights`,
    config,
    {
      fields: 'spend,impressions,clicks,actions',
      time_increment: '1',
      date_preset: datePreset,
      limit: '500',
    }
  )
  return result.data || []
}

// Validar credenciais
export async function validateCredentials(config: FacebookConfig): Promise<{ valid: boolean; name?: string; error?: string }> {
  try {
    const accountId = normalizeAdAccountId(config.adAccountId)
    const result = await fbFetch<{ name: string; id: string }>(
      `/${accountId}`,
      config,
      { fields: 'name,id' }
    )
    return { valid: true, name: result.name }
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : 'Erro ao validar conta' }
  }
}

/**
 * Deduplicated action extractor to prevent double-counting canonical Meta action types
 */
export function extractExactAction(actions: Array<{ action_type: string; value: string }> | undefined, primaryTypes: string[]): number {
  if (!actions || actions.length === 0) return 0

  for (const pType of primaryTypes) {
    const found = actions.find(a => a.action_type === pType || a.action_type.endsWith(`.${pType}`))
    if (found) {
      return Number(found.value) || 0
    }
  }

  const fallback = actions.find(a => primaryTypes.some(p => a.action_type.includes(p)))
  return fallback ? Number(fallback.value) || 0 : 0
}

export function extractMessages(actions?: Array<{ action_type: string; value: string }>): number {
  return extractExactAction(actions, [
    'messaging_conversation_started_7d',
    'messaging_user_initiated',
    'onsite_conversion.messaging_conversation_started_7d',
    'messaging'
  ])
}

export function extractLeads(actions?: Array<{ action_type: string; value: string }>): number {
  return extractExactAction(actions, ['lead', 'offsite_conversion.fb_pixel_lead', 'onsite_conversion.lead_grouped'])
}

export function extractPurchases(actions?: Array<{ action_type: string; value: string }>): number {
  return extractExactAction(actions, ['purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase'])
}

export function extractVideoViews(actions?: Array<{ action_type: string; value: string }>): number {
  return extractExactAction(actions, ['video_view', 'video_play'])
}

export function extractPurchaseValue(actionValues?: Array<{ action_type: string; value: string }>): number {
  if (!actionValues || actionValues.length === 0) return 0
  const found = actionValues.find(a => a.action_type === 'purchase' || a.action_type.includes('purchase'))
  return found ? Number(found.value) || 0 : 0
}

/**
 * Smart Conversions / Results extraction based on campaign objective (Matches Meta Ads Manager Results column)
 */
export function extractCampaignResults(objective: string, actions?: Array<{ action_type: string; value: string }>): { conversions: number; resultLabel: string } {
  if (!actions || actions.length === 0) {
    return { conversions: 0, resultLabel: 'Conversões' }
  }

  const messages = extractMessages(actions)
  const leads = extractLeads(actions)
  const purchases = extractPurchases(actions)
  const landingPageViews = extractExactAction(actions, ['landing_page_view', 'offsite_conversion.fb_pixel_custom'])
  const linkClicks = extractExactAction(actions, ['link_click', 'inline_link_clicks'])

  const objUpper = (objective || '').toUpperCase()

  // Match by objective
  if (objUpper.includes('ENGAGEMENT') || objUpper.includes('MESSAGE')) {
    if (messages > 0) return { conversions: messages, resultLabel: 'Msgs Iniciadas' }
  }

  if (objUpper.includes('LEAD')) {
    if (leads > 0) return { conversions: leads, resultLabel: 'Leads' }
  }

  if (objUpper.includes('SALE') || objUpper.includes('CONVERSION')) {
    if (purchases > 0) return { conversions: purchases, resultLabel: 'Compras' }
  }

  if (objUpper.includes('TRAFFIC')) {
    if (landingPageViews > 0) return { conversions: landingPageViews, resultLabel: 'Visitas à Página' }
    if (linkClicks > 0) return { conversions: linkClicks, resultLabel: 'Cliques no Link' }
  }

  // Fallbacks: take non-zero specific metric
  if (purchases > 0) return { conversions: purchases, resultLabel: 'Compras' }
  if (leads > 0) return { conversions: leads, resultLabel: 'Leads' }
  if (messages > 0) return { conversions: messages, resultLabel: 'Msgs Iniciadas' }
  if (landingPageViews > 0) return { conversions: landingPageViews, resultLabel: 'Visitas à Página' }

  // Sum pixel / custom conversions if present
  const pixelConversions = actions
    .filter(a => a.action_type.includes('offsite_conversion') || a.action_type.includes('onsite_conversion'))
    .reduce((max, a) => Math.max(max, Number(a.value) || 0), 0)

  if (pixelConversions > 0) return { conversions: pixelConversions, resultLabel: 'Conversões' }

  return { conversions: 0, resultLabel: 'Resultados' }
}
