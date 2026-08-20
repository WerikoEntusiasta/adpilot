export interface Campaign {
  id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
  objective: string
  dailyBudget: number
  spend: number
  impressions: number
  reach?: number
  clicks: number
  ctr: number
  cpc: number
  conversions: number
  messages?: number
  leads?: number
  purchases?: number
  videoViews?: number
  cpa: number
  costPerMessage?: number
  costPerLead?: number
  roas: number
  startDate: string
  endDate: string | null
}

export interface DailyMetric {
  date: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  messages?: number
}

export interface AiSuggestion {
  id: string
  type: 'improvement' | 'new_campaign' | 'warning' | 'opportunity'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  campaignId?: string
  campaignName?: string
  action: string
  details?: Record<string, unknown>
}

export const mockCampaigns: Campaign[] = [
  {
    id: 'camp_001',
    name: 'Lançamento Produto X — Tráfego',
    status: 'ACTIVE',
    objective: 'OUTCOME_TRAFFIC',
    dailyBudget: 150,
    spend: 3247.80,
    impressions: 284500,
    reach: 210000,
    clicks: 8535,
    ctr: 3.0,
    cpc: 0.38,
    conversions: 342,
    messages: 0,
    leads: 120,
    purchases: 0,
    videoViews: 4500,
    cpa: 9.49,
    roas: 4.2,
    startDate: '2026-07-15',
    endDate: null,
  },
  {
    id: 'camp_002',
    name: 'WhatsApp — Vendas Diretas & Atendimento',
    status: 'ACTIVE',
    objective: 'OUTCOME_ENGAGEMENT',
    dailyBudget: 120,
    spend: 2150.00,
    impressions: 145000,
    reach: 98000,
    clicks: 6200,
    ctr: 4.2,
    cpc: 0.34,
    conversions: 280,
    messages: 420,
    leads: 0,
    purchases: 85,
    costPerMessage: 5.11,
    cpa: 7.67,
    roas: 5.8,
    startDate: '2026-07-20',
    endDate: null,
  },
  {
    id: 'camp_003',
    name: 'Branding — Awareness Institucional',
    status: 'ACTIVE',
    objective: 'OUTCOME_AWARENESS',
    dailyBudget: 200,
    spend: 4120.00,
    impressions: 820000,
    reach: 650000,
    clicks: 12300,
    ctr: 1.5,
    cpc: 0.33,
    conversions: 0,
    messages: 0,
    leads: 0,
    purchases: 0,
    videoViews: 42000,
    cpa: 0,
    roas: 0,
    startDate: '2026-08-01',
    endDate: '2026-08-31',
  },
  {
    id: 'camp_004',
    name: 'Black Friday — Vendas E-commerce',
    status: 'PAUSED',
    objective: 'OUTCOME_SALES',
    dailyBudget: 500,
    spend: 12450.00,
    impressions: 560000,
    reach: 410000,
    clicks: 22400,
    ctr: 4.0,
    cpc: 0.56,
    conversions: 896,
    messages: 45,
    leads: 210,
    purchases: 640,
    cpa: 13.89,
    roas: 3.1,
    startDate: '2025-11-20',
    endDate: '2025-11-30',
  },
  {
    id: 'camp_005',
    name: 'Leads — Formulário de Inscrição',
    status: 'ACTIVE',
    objective: 'OUTCOME_LEADS',
    dailyBudget: 90,
    spend: 1880.00,
    impressions: 89000,
    reach: 62000,
    clicks: 4100,
    ctr: 4.6,
    cpc: 0.45,
    conversions: 245,
    messages: 12,
    leads: 245,
    purchases: 0,
    costPerLead: 7.67,
    cpa: 7.67,
    roas: 0,
    startDate: '2026-08-05',
    endDate: null,
  },
]

export const mockDailyMetrics: DailyMetric[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(2026, 7, i + 1)
  const base = Math.random() * 300 + 200
  return {
    date: date.toISOString().split('T')[0],
    spend: Math.round(base * 100) / 100,
    impressions: Math.round(base * 80 + Math.random() * 5000),
    clicks: Math.round(base * 3 + Math.random() * 200),
    conversions: Math.round(base * 0.15 + Math.random() * 10),
    messages: Math.round(base * 0.1 + Math.random() * 8),
  }
})

export const mockSuggestions: AiSuggestion[] = [
  {
    id: 'sug_001',
    type: 'improvement',
    title: 'Aumentar orçamento da campanha de WhatsApp',
    description: 'A campanha de atendimento via WhatsApp tem custo por mensagem iniciada de apenas R$ 5.11 e ROAS de 5.8x. Aumente o orçamento para escalar conversas qualificadas.',
    impact: 'high',
    campaignId: 'camp_002',
    campaignName: 'WhatsApp — Vendas Diretas & Atendimento',
    action: 'update_budget',
    details: { currentBudget: 120, suggestedBudget: 200, estimatedExtraMessages: 65 },
  },
  {
    id: 'sug_002',
    type: 'warning',
    title: 'CTR baixo na campanha de Branding',
    description: 'A campanha "Branding — Awareness Institucional" tem CTR de 1.5%. Sugerimos testar novos criativos em vídeo curto para elevar o engajamento.',
    impact: 'medium',
    campaignId: 'camp_003',
    campaignName: 'Branding — Awareness Institucional',
    action: 'update_creative',
    details: { currentCtr: 1.5, targetCtr: 2.5 },
  },
]
