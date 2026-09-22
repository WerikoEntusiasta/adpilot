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
  frequency?: string
  actions?: Array<{ action_type: string; value: string }>
  action_values?: Array<{ action_type: string; value: string }>
  date_start: string
  date_stop: string
}

function normalizeAdAccountId(id: string): string {
  const trimmed = id.trim()
  return trimmed.startsWith('act_') ? trimmed : 'act_' + trimmed
}

interface FbPagedResponse<T> {
  data?: T[]
  paging?: {
    cursors?: {
      before?: string
      after?: string
    }
    next?: string
  }
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

// Busca com paginação automática (resolve limites de 25/100 e traz todas as páginas)
async function fbFetchAll<T>(
  endpoint: string,
  config: FacebookConfig,
  params: Record<string, string> = {},
  maxItems: number = 1000
): Promise<T[]> {
  let allData: T[] = []
  let nextUrl: string | null = null
  let pageCount = 0

  const url = new URL(GRAPH_API_BASE + endpoint)
  url.searchParams.set('access_token', config.accessToken.trim())
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }

  nextUrl = url.toString()

  while (nextUrl && allData.length < maxItems && pageCount < 15) {
    pageCount++
    const res = await fetch(nextUrl)
    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      if (allData.length === 0) {
        throw new Error(error?.error?.message || 'Facebook API error (' + res.status + '): ' + res.statusText)
      }
      console.warn('Aviso de paginação do Facebook:', error)
      break
    }

    const json: FbPagedResponse<T> = await res.json()
    if (json.data && Array.isArray(json.data)) {
      allData = allData.concat(json.data)
    }

    if (json.paging?.next && json.data && json.data.length > 0) {
      nextUrl = json.paging.next
    } else {
      nextUrl = null
    }
  }

  return allData
}

// Buscar todas as campanhas da conta com paginação e todos os status
export async function getCampaigns(config: FacebookConfig): Promise<FacebookCampaign[]> {
  const accountId = normalizeAdAccountId(config.adAccountId)
  // 1. Busca direta sem filtros restritivos (Meta retorna todas as campanhas da conta)
  try {
    const campaigns = await fbFetchAll<FacebookCampaign>(
      '/' + accountId + '/campaigns',
      config,
      {
        fields: 'id,name,status,effective_status,objective,daily_budget,lifetime_budget,created_time,start_time,stop_time',
        limit: '150',
      }
    )
    if (campaigns && campaigns.length > 0) {
      return campaigns
    }
  } catch (err) {
    console.warn('Busca direta de campanhas falhou, tentando fallback:', err)
  }

  // 2. Fallback abrangendo todos os estados de entrega do Meta
  return fbFetchAll<FacebookCampaign>(
    '/' + accountId + '/campaigns',
    config,
    {
      fields: 'id,name,status,effective_status,objective,daily_budget,lifetime_budget,created_time,start_time,stop_time',
      filtering: JSON.stringify([
        { field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED', 'ARCHIVED', 'IN_PROCESS', 'WITH_ISSUES', 'PENDING_REVIEW', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED'] }
      ]),
      limit: '150',
    }
  )
}

// Buscar Conjuntos de Anúncios de uma Campanha (com paginação)
export async function getAdSetsByCampaign(campaignId: string, config: FacebookConfig): Promise<FacebookAdSet[]> {
  try {
    const adSets = await fbFetchAll<FacebookAdSet>(
      '/' + campaignId + '/adsets',
      config,
      {
        fields: 'id,name,status,effective_status,campaign_id,daily_budget,lifetime_budget,billing_event,optimization_goal,targeting,created_time,start_time,end_time',
        limit: '150',
      }
    )
    if (adSets && adSets.length > 0) {
      return adSets
    }
  } catch (err) {
    console.warn('Fallback adsets:', err)
  }

  return fbFetchAll<FacebookAdSet>(
    '/' + campaignId + '/adsets',
    config,
    {
      fields: 'id,name,status,effective_status,campaign_id,daily_budget,lifetime_budget,billing_event,optimization_goal,targeting,created_time,start_time,end_time',
      filtering: JSON.stringify([
        { field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED', 'ARCHIVED', 'IN_PROCESS', 'WITH_ISSUES', 'PENDING_REVIEW', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED'] }
      ]),
      limit: '150',
    }
  )
}

// Buscar Anúncios de uma Campanha (com criativos e paginação)
export async function getAdsByCampaign(campaignId: string, config: FacebookConfig): Promise<FacebookAd[]> {
  try {
    const ads = await fbFetchAll<FacebookAd>(
      '/' + campaignId + '/ads',
      config,
      {
        fields: 'id,name,status,effective_status,adset_id,campaign_id,creative{id,name,title,body,image_url,thumbnail_url,object_story_spec}',
        limit: '150',
      }
    )
    if (ads && ads.length > 0) {
      return ads
    }
  } catch (err) {
    console.warn('Fallback ads:', err)
  }

  return fbFetchAll<FacebookAd>(
    '/' + campaignId + '/ads',
    config,
    {
      fields: 'id,name,status,effective_status,adset_id,campaign_id,creative{id,name,title,body,image_url,thumbnail_url,object_story_spec}',
      filtering: JSON.stringify([
        { field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED', 'ARCHIVED', 'IN_PROCESS', 'WITH_ISSUES', 'PENDING_REVIEW', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED'] }
      ]),
      limit: '150',
    }
  )
}

// Buscar Insights a nível de AdSet
export async function getAdSetInsights(campaignId: string, config: FacebookConfig, datePreset: string = 'maximum'): Promise<FacebookInsight[]> {
  return fbFetchAll<FacebookInsight>(
    '/' + campaignId + '/insights',
    config,
    {
      fields: 'adset_id,adset_name,spend,impressions,clicks,ctr,cpc,cpm,reach,actions,action_values',
      level: 'adset',
      date_preset: datePreset,
      limit: '100',
    }
  )
}

// Buscar Insights a nível de Ad (Anúncio)
export async function getAdInsights(campaignId: string, config: FacebookConfig, datePreset: string = 'maximum'): Promise<FacebookInsight[]> {
  return fbFetchAll<FacebookInsight>(
    '/' + campaignId + '/insights',
    config,
    {
      fields: 'ad_id,ad_name,spend,impressions,clicks,ctr,cpc,cpm,reach,actions,action_values',
      level: 'ad',
      date_preset: datePreset,
      limit: '100',
    }
  )
}

// Buscar insights de todas as campanhas (com paginação)
export async function getCampaignInsights(
  config: FacebookConfig,
  datePreset: string = 'maximum'
): Promise<FacebookInsight[]> {
  const accountId = normalizeAdAccountId(config.adAccountId)
  return fbFetchAll<FacebookInsight>(
    '/' + accountId + '/insights',
    config,
    {
      fields: 'campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,cpm,reach,actions,action_values',
      level: 'campaign',
      date_preset: datePreset,
      limit: '100',
    }
  )
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
  const primaryTypes = [
    'omni_purchase',
    'offsite_conversion.fb_pixel_purchase',
    'purchase',
    'onsite_web_purchase',
    'onsite_conversion.purchase'
  ]
  for (const pType of primaryTypes) {
    const found = actionValues.find(a => a.action_type === pType || a.action_type.endsWith('.' + pType))
    if (found && Number(found.value) > 0) {
      return Number(found.value) || 0
    }
  }
  const fallback = actionValues.find(a => a.action_type.includes('purchase'))
  return fallback ? Number(fallback.value) || 0 : 0
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

// Buscar todos os anúncios da conta com dados de criativo
export async function getAccountAds(config: FacebookConfig): Promise<FacebookAd[]> {
  const accountId = normalizeAdAccountId(config.adAccountId)
  try {
    const ads = await fbFetchAll<FacebookAd>(
      '/' + accountId + '/ads',
      config,
      {
        fields: 'id,name,status,effective_status,adset_id,campaign_id,creative{id,name,title,body,image_url,thumbnail_url,video_id,object_story_spec}',
        limit: '150',
      }
    )
    if (ads && ads.length > 0) return ads
  } catch (err) {
    console.warn('Fallback getAccountAds:', err)
  }

  return fbFetchAll<FacebookAd>(
    '/' + accountId + '/ads',
    config,
    {
      fields: 'id,name,status,effective_status,adset_id,campaign_id,creative{id,name,title,body,image_url,thumbnail_url,video_id,object_story_spec}',
      filtering: JSON.stringify([
        { field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED', 'ARCHIVED', 'IN_PROCESS', 'WITH_ISSUES', 'PENDING_REVIEW', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED'] }
      ]),
      limit: '150',
    }
  )
}

// Buscar insights de todos os anúncios da conta
export async function getAccountAdInsights(config: FacebookConfig, datePreset: string = 'maximum'): Promise<FacebookInsight[]> {
  const accountId = normalizeAdAccountId(config.adAccountId)
  return fbFetchAll<FacebookInsight>(
    '/' + accountId + '/insights',
    config,
    {
      fields: 'ad_id,ad_name,spend,impressions,clicks,ctr,cpc,cpm,reach,frequency,actions,action_values',
      level: 'ad',
      date_preset: datePreset,
      limit: '100',
    }
  )
}

// Atualizar status de um anúncio (ex: pausar pelo Stop-Loss)
export async function updateAdStatus(adId: string, status: 'ACTIVE' | 'PAUSED', config: FacebookConfig): Promise<{ success: boolean }> {
  const res = await fetch(GRAPH_API_BASE + '/' + adId, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      access_token: config.accessToken.trim(),
      status: status,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || 'Falha ao atualizar status do anúncio no Facebook (' + res.status + ')')
  }
  return { success: true }
}
