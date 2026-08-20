'use client'

import { useEffect, useState, useMemo } from 'react'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { CampaignTable } from '@/components/dashboard/campaign-table'
import { PerformanceChart } from '@/components/dashboard/performance-chart'
import { mockCampaigns, mockDailyMetrics, type Campaign, type DailyMetric } from '@/lib/mock-data'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import {
  DollarSign,
  Eye,
  MousePointer,
  Target,
  TrendingUp,
  BarChart3,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  Users,
  ShoppingBag,
  Radio,
  Filter,
} from 'lucide-react'
import { useSettings } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function DashboardPage() {
  const settings = useSettings()
  const [mounted, setMounted] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns)
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>(mockDailyMetrics)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isRealData, setIsRealData] = useState(false)

  // Objective filter for modular metrics view
  const [selectedObjective, setSelectedObjective] = useState<string>('ALL')

  useEffect(() => {
    setMounted(true)
  }, [])

  const loadRealData = async () => {
    if (!settings.hasFbKeys()) return
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const res = await fetch('/api/facebook/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: settings.fbAccessToken,
          adAccountId: settings.fbAdAccountId,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setErrorMessage(data.error || 'Não foi possível carregar os dados da API do Facebook.')
        setIsRealData(false)
      } else {
        setCampaigns(data.campaigns || [])
        if (data.dailyMetrics && data.dailyMetrics.length > 0) {
          setDailyMetrics(data.dailyMetrics)
        }
        setIsRealData(true)
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro de conexão')
      setIsRealData(false)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (mounted && settings.hasFbKeys()) {
      loadRealData()
    }
  }, [mounted, settings.fbAccessToken, settings.fbAdAccountId])

  // Filter campaigns by objective
  const filteredCampaigns = useMemo(() => {
    if (selectedObjective === 'ALL') return campaigns
    if (selectedObjective === 'MESSAGES') {
      return campaigns.filter(c => c.objective.includes('ENGAGEMENT') || c.objective.includes('MESSAGES') || (c.messages && c.messages > 0))
    }
    return campaigns.filter(c => c.objective === selectedObjective)
  }, [campaigns, selectedObjective])

  // Modular Summary calculations based on filtered campaigns
  const totalSpend = filteredCampaigns.reduce((sum, c) => sum + c.spend, 0)
  const totalImpressions = filteredCampaigns.reduce((sum, c) => sum + c.impressions, 0)
  const totalReach = filteredCampaigns.reduce((sum, c) => sum + (c.reach || 0), 0)
  const totalClicks = filteredCampaigns.reduce((sum, c) => sum + c.clicks, 0)
  const totalMessages = filteredCampaigns.reduce((sum, c) => sum + (c.messages || 0), 0)
  const totalLeads = filteredCampaigns.reduce((sum, c) => sum + (c.leads || 0), 0)
  const totalPurchases = filteredCampaigns.reduce((sum, c) => sum + (c.purchases || 0), 0)
  const totalConversions = filteredCampaigns.reduce((sum, c) => sum + c.conversions, 0)

  const avgCtr = filteredCampaigns.length > 0
    ? filteredCampaigns.reduce((sum, c) => sum + c.ctr, 0) / filteredCampaigns.length
    : 0
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0
  const costPerMessage = totalMessages > 0 ? totalSpend / totalMessages : 0
  const costPerLead = totalLeads > 0 ? totalSpend / totalLeads : 0
  const avgRoas = filteredCampaigns.length > 0
    ? filteredCampaigns.reduce((sum, c) => sum + (c.roas || 0), 0) / filteredCampaigns.length
    : 0

  const handleStatusChange = async (id: string, newStatus: 'ACTIVE' | 'PAUSED') => {
    setCampaigns(prev =>
      prev.map(c => (c.id === id ? { ...c, status: newStatus } : c))
    )

    if (isRealData) {
      try {
        await fetch('https://graph.facebook.com/v21.0/' + id, {
          method: 'POST',
          body: new URLSearchParams({
            access_token: settings.fbAccessToken,
            status: newStatus,
          }),
        })
      } catch (err) {
        console.error('Erro ao atualizar status via Facebook API:', err)
      }
    }
  }

  // Objective relevancy logic for KPI cards
  const isMessageRelevant = selectedObjective === 'ALL' || selectedObjective === 'MESSAGES' || selectedObjective === 'OUTCOME_ENGAGEMENT'
  const isSalesRelevant = selectedObjective === 'ALL' || selectedObjective === 'OUTCOME_SALES'
  const isLeadRelevant = selectedObjective === 'ALL' || selectedObjective === 'OUTCOME_LEADS'
  const isTrafficRelevant = selectedObjective === 'ALL' || selectedObjective === 'OUTCOME_TRAFFIC'
  const isAwarenessRelevant = selectedObjective === 'ALL' || selectedObjective === 'OUTCOME_AWARENESS'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Visão Geral
            {isRealData && (
              <span className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-normal px-2.5 py-0.5 rounded-full">
                ● Dados em Tempo Real (Facebook API)
              </span>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">Métricas modulares e inteligência de anúncios por objetivo</p>
        </div>

        <div className="flex items-center gap-2">
          {mounted && settings.hasFbKeys() && (
            <Button variant="outline" size="sm" onClick={loadRealData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Sincronizar
            </Button>
          )}
        </div>
      </div>

      {/* Filter by Campaign Objective */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-card border gap-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="h-4 w-4 text-primary" />
          <span>Filtrar Métricas por Objetivo da Campanha:</span>
        </div>
        <Select value={selectedObjective} onValueChange={setSelectedObjective}>
          <SelectTrigger className="w-full sm:w-[260px]">
            <SelectValue placeholder="Todos os Objetivos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">🌐 Todos os Objetivos (Visão Geral)</SelectItem>
            <SelectItem value="MESSAGES">💬 Mensagens / WhatsApp / Direct</SelectItem>
            <SelectItem value="OUTCOME_SALES">🛍️ Vendas & Conversões</SelectItem>
            <SelectItem value="OUTCOME_LEADS">📋 Geração de Leads</SelectItem>
            <SelectItem value="OUTCOME_TRAFFIC">🚀 Tráfego & Cliques</SelectItem>
            <SelectItem value="OUTCOME_AWARENESS">📢 Alcance & Branding</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status Alerts */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Erro na Sincronização com o Facebook API:</span>
          </div>
          <p className="font-mono text-xs">{errorMessage}</p>
        </div>
      )}

      {mounted && !settings.hasFbKeys() && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
            <span>Exibindo métricas simuladas (Modo Demo). Configure suas chaves do Facebook em Configurações para métricas reais.</span>
          </div>
          <Button size="sm" variant="outline" asChild>
            <a href="/dashboard/settings">Configurar Chaves</a>
          </Button>
        </div>
      )}

      {/* MODULAR KPI CARDS GRID */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Métricas Principais ({selectedObjective === 'ALL' ? 'Todas as Campanhas' : selectedObjective})
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* Universal Metrics */}
          <KpiCard
            title="Gasto Total"
            value={formatCurrency(totalSpend)}
            icon={DollarSign}
            badge="Geral"
            isHighlight={true}
          />
          <KpiCard
            title="Impressões"
            value={formatNumber(totalImpressions)}
            icon={Eye}
            badge="Geral"
          />

          {/* Messaging / WhatsApp Metrics */}
          <KpiCard
            title="Mensagens Iniciadas (WhatsApp/Direct)"
            value={formatNumber(totalMessages)}
            icon={MessageSquare}
            badge="WhatsApp / Direct"
            isApplicable={isMessageRelevant}
            isHighlight={selectedObjective === 'MESSAGES'}
            subtitle={costPerMessage > 0 ? `Custo p/ Msg: ${formatCurrency(costPerMessage)}` : undefined}
          />
          <KpiCard
            title="Custo por Mensagem"
            value={formatCurrency(costPerMessage)}
            icon={BarChart3}
            badge="WhatsApp / Direct"
            isApplicable={isMessageRelevant && totalMessages > 0}
          />

          {/* Lead Metrics */}
          <KpiCard
            title="Leads Gerados"
            value={formatNumber(totalLeads)}
            icon={Users}
            badge="Leads"
            isApplicable={isLeadRelevant}
            isHighlight={selectedObjective === 'OUTCOME_LEADS'}
            subtitle={costPerLead > 0 ? `CPL: ${formatCurrency(costPerLead)}` : undefined}
          />
          <KpiCard
            title="Custo por Lead (CPL)"
            value={formatCurrency(costPerLead)}
            icon={BarChart3}
            badge="Leads"
            isApplicable={isLeadRelevant && totalLeads > 0}
          />

          {/* Sales & Conversion Metrics */}
          <KpiCard
            title="Vendas / Conversões"
            value={formatNumber(totalConversions)}
            icon={ShoppingBag}
            badge="Vendas / E-commerce"
            isApplicable={isSalesRelevant}
            isHighlight={selectedObjective === 'OUTCOME_SALES'}
          />
          <KpiCard
            title="ROAS Médio"
            value={avgRoas > 0 ? `${avgRoas.toFixed(1)}x` : '—'}
            icon={TrendingUp}
            badge="Vendas"
            isApplicable={isSalesRelevant}
          />

          {/* Traffic Metrics */}
          <KpiCard
            title="Cliques no Link"
            value={formatNumber(totalClicks)}
            icon={MousePointer}
            badge="Tráfego"
            isApplicable={isTrafficRelevant}
            isHighlight={selectedObjective === 'OUTCOME_TRAFFIC'}
          />
          <KpiCard
            title="CTR Médio"
            value={formatPercent(avgCtr)}
            icon={TrendingUp}
            badge="Tráfego"
            isApplicable={isTrafficRelevant}
          />
          <KpiCard
            title="CPC Médio"
            value={formatCurrency(avgCpc)}
            icon={BarChart3}
            badge="Tráfego"
            isApplicable={isTrafficRelevant}
          />

          {/* Reach / Branding Metrics */}
          <KpiCard
            title="Alcance Total (Reach)"
            value={formatNumber(totalReach)}
            icon={Radio}
            badge="Branding"
            isApplicable={isAwarenessRelevant}
            isHighlight={selectedObjective === 'OUTCOME_AWARENESS'}
          />
        </div>
      </div>

      {/* Charts */}
      <PerformanceChart data={dailyMetrics} />

      {/* Campaign Table */}
      <CampaignTable campaigns={filteredCampaigns} onStatusChange={handleStatusChange} />
    </div>
  )
}
