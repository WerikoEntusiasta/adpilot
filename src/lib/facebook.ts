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

export interface FacebookAdSet {
  id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED'
  campaign_id: string
  daily_budget?: string
  lifetime_budget?: string
  billing_event?: string
  optimization_goal?: string
  targeting?: any
  created_time: string
  start_time?: string
  end_time?: string
}

export interface FacebookAd {
  id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED'
  adset_id: string
  campaign_id: string
  creative?: {
    id: string
    name?: string
    title?: string
    body?: string
    image_url?: string
    thumbnail_url?: string
  }
}

export interface FacebookInsight {
  campaign_id?: string
  campaign_name?: string
  adset_id?: string
  adset_name?: string
  ad_id?: string
  ad_name?: string
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
  return trimmed.startsWith('act_') ? trimmed : 'act_' + trimmed
}

async function fbFetch<T>(endpoint: string, config: FacebookConfig, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(GRAPH_API_BASE + endpoint)
  url.searchParams.set('access_token', config.accessToken.trim())
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }

  const res = await fetch(url.toString())
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error?.error?.message || 'Facebook API error (' + res.status + '): ' + res.statusText)
  }
  return res.json() as Promise<T>
}

// Buscar todas as campanhas da conta
export async function getCampaigns(config: FacebookConfig): Promise<FacebookCampaign[]> {
  const accountId = normalizeAdAccountId(config.adAccountId)
  const result = await fbFetch<{ data: FacebookCampaign[] }>(
    '/' + accountId + '/campaigns',
    config,
    {
      fields: 'id,name,status,objective,daily_budget,lifetime_budget,created_time,start_time,stop_time',
      limit: '100',
    }
  )
  return result.data || []
}

// Buscar Conjuntos de Anúncios de uma Campanha
export async function getAdSetsByCampaign(campaignId: string, config: FacebookConfig): Promise<FacebookAdSet[]> {
  const result = await fbFetch<{ data: FacebookAdSet[] }>(
    '/' + campaignId + '/adsets',
    config,
    {
      fields: 'id,name,status,campaign_id,daily_budget,lifetime_budget,billing_event,optimization_goal,targeting,created_time,start_time,end_time',
      limit: '100',
    }
  )
  return result.data || []
}

// Buscar Anúncios de uma Campanha (com criativos)
export async function getAdsByCampaign(campaignId: string, config: FacebookConfig): Promise<FacebookAd[]> {
  const result = await fbFetch<{ data: any[] }>(
    '/' + campaignId + '/ads',
    config,
    {
      fields: 'id,name,status,adset_id,campaign_id,creative{id,name,title,body,image_url,thumbnail_url,object_story_spec}',
      limit: '100',
    }
  )
  return result.data || []
}

// Buscar Insights a nível de AdSet
export async function getAdSetInsights(campaignId: string, config: FacebookConfig, datePreset: string = 'maximum'): Promise<FacebookInsight[]> {
  const result = await fbFetch<{ data: FacebookInsight[] }>(
    '/' + campaignId + '/insights',
    config,
    {
      fields: 'adset_id,adset_name,spend,impressions,clicks,ctr,cpc,cpm,reach,actions,action_values',
      level: 'adset',
      date_preset: datePreset,
      limit: '100',
    }
  )
  return result.data || []
}

// Buscar Insights a nível de Ad (Anúncio)
export async function getAdInsights(campaignId: string, config: FacebookConfig, datePreset: string = 'maximum'): Promise<FacebookInsight[]> {
  const result = await fbFetch<{ data: FacebookInsight[] }>(
    '/' + campaignId + '/insights',
    config,
    {
      fields: 'ad_id,ad_name,spend,impressions,clicks,ctr,cpc,cpm,reach,actions,action_values',
      level: 'ad',
      date_preset: datePreset,
      limit: '100',
    }
  )
  return result.data || []
}

// Buscar insights das campanhas
export async function getCampaignInsights(
  config: FacebookConfig,
  datePreset: string = 'maximum'
): Promise<FacebookInsight[]> {
  const accountId = normalizeAdAccountId(config.adAccountId)
  const result = await fbFetch<{ data: FacebookInsight[] }>(
    '/' + accountId + '/insights',
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
  datePreset: string = 'maximum'
): Promise<FacebookInsight[]> {
  const accountId = normalizeAdAccountId(config.adAccountId)
  const result = await fbFetch<{ data: FacebookInsight[] }>(
    '/' + accountId + '/insights',
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
      '/' + accountId,
      config,
      { fields: 'name,id' }
    )
    return { valid: true, name: result.name }
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : 'Erro ao validar conta' }
  }
}

export function extractExactAction(actions: Array<{ action_type: string; value: string }> | undefined, primaryTypes: string[]): number {
  if (!actions || actions.length === 0) return 0

  for (const pType of primaryTypes) {
    const found = actions.find(a => a.action_type === pType || a.action_type.endsWith('.' + pType))
    if (found) {
      return Number(found.value) || 0
    }
  }

  const fallback = actions.find(a => primaryTypes.some(p => a.action_type.includes(p)))
  return fallback ? Number(fallback.value) || 0 : 0
}

// WhatsApp / Mensagens
export function extractMessages(actions?: Array<{ action_type: string; value: string }>): number {
  return extractExactAction(actions, [
    'onsite_conversion.messaging_conversation_started_7d',
    'messaging_conversation_started_7d',
    'messaging_user_initiated',
    'messaging'
  ])
}

// Vendas / Compras no Site
export function extractPurchases(actions?: Array<{ action_type: string; value: string }>): number {
  return extractExactAction(actions, [
    'offsite_conversion.fb_pixel_purchase',
    'purchase',
    'omni_purchase'
  ])
}

// Leads (Formulários ou outros)
export function extractLeads(actions?: Array<{ action_type: string; value: string }>): number {
  return extractExactAction(actions, [
    'lead',
    'offsite_conversion.fb_pixel_lead',
    'onsite_conversion.lead_grouped'
  ])
}

export function extractVideoViews(actions?: Array<{ action_type: string; value: string }>): number {
  return extractExactAction(actions, ['video_view', 'video_play'])
}

export function extractPurchaseValue(actionValues?: Array<{ action_type: string; value: string }>): number {
  if (!actionValues || actionValues.length === 0) return 0
  const found = actionValues.find(a => a.action_type === 'purchase' || a.action_type.includes('purchase'))
  return found ? Number(found.value) || 0 : 0
}

export function extractCampaignResults(objective: string, actions?: Array<{ action_type: string; value: string }>): { 
  conversions: number; 
  resultLabel: string;
  isSale: boolean;
  isLead: boolean;
  salesCount: number;
  leadsCount: number;
} {
  const messages = extractMessages(actions)
  const purchases = extractPurchases(actions)
  const otherLeads = extractLeads(actions)

  const totalLeads = messages + otherLeads
  const totalSales = purchases

  if (totalSales > 0) {
    return {
      conversions: totalSales,
      resultLabel: 'Vendas (Site)',
      isSale: true,
      isLead: false,
      salesCount: totalSales,
      leadsCount: totalLeads
    }
  }

  if (totalLeads > 0) {
    return {
      conversions: totalLeads,
      resultLabel: messages > 0 ? 'Leads (WhatsApp)' : 'Leads',
      isSale: false,
      isLead: true,
      salesCount: totalSales,
      leadsCount: totalLeads
    }
  }

  return {
    conversions: 0,
    resultLabel: 'Sem Resultados',
    isSale: false,
    isLead: false,
    salesCount: 0,
    leadsCount: 0
  }
}
