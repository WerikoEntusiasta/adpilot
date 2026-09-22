'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { CampaignTable } from '@/components/dashboard/campaign-table'
import { PerformanceChart } from '@/components/dashboard/performance-chart'
import { ExportReportModal } from '@/components/dashboard/export-report-modal'
import type { Campaign, DailyMetric } from '@/lib/mock-data'
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
  Filter,
  Sparkles,
  Info,
  Calendar,
  Archive,
  PauseCircle,
  Layers,
  ShieldAlert,
  Trophy,
  ArrowRight
} from 'lucide-react'
import { useSettings } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

export default function DashboardPage() {
  const settings = useSettings()
  const [mounted, setMounted] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isRealData, setIsRealData] = useState(false)

  // Período de métricas (padrão maximum para trazer todo o histórico real)
  const [datePreset, setDatePreset] = useState<string>('maximum')

  // Objetivo selecionado (padrão inicial ALL para exibir todas as campanhas)
  const [selectedObjective, setSelectedObjective] = useState<string>('ALL')
  // Controla se o usuário escolheu o filtro manualmente
  const [hasUserManuallySelected, setHasUserManuallySelected] = useState(false)
  // Guarda o objetivo detectado automaticamente
  const [autoDetectedObjective, setAutoDetectedObjective] = useState<{ id: string; name: string } | null>(null)
  // Status tab para a tabela (Guia separada para Arquivadas / Rodando / Pausadas / Todas)
  const [tableStatusTab, setTableStatusTab] = useState<'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'ALL'>('ACTIVE')

  useEffect(() => {
    setMounted(true)
  }, [])

  const loadRealData = async (preset = datePreset) => {
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
          useAdminToken: settings.useAdminFbToken,
          datePreset: preset,
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
      loadRealData(datePreset)
    }
  }, [mounted, settings.fbAccessToken, settings.fbAdAccountId, settings.useAdminFbToken, datePreset])

  // IDENTIFICAÇÃO AUTOMÁTICA DO OBJETIVO DA CAMPANHA
  useEffect(() => {
    if (campaigns.length > 0 && !hasUserManuallySelected) {
      const activeList = campaigns.filter(c => c.status === 'ACTIVE')
      const targetList = activeList.length > 0 ? activeList : campaigns

      let salesCount = 0
      let leadCount = 0
      let msgCount = 0
      let trafficCount = 0

      targetList.forEach(c => {
        const obj = (c.objective || '').toUpperCase()
        const hasPurchases = (c.purchases && c.purchases > 0) || (c.purchaseValue && c.purchaseValue > 0)
        const hasMessages = c.messages && c.messages > 0
        const hasLeads = c.leads && c.leads > 0

        if (obj.includes('SALE') || obj.includes('CONVERSION') || hasPurchases) {
          salesCount++
        } else if (obj.includes('LEAD') || hasLeads) {
          leadCount++
        } else if (obj.includes('MESSAGE') || obj.includes('ENGAGEMENT') || hasMessages) {
          msgCount++
        } else if (obj.includes('TRAFFIC') || (c.clicks && c.clicks > 50)) {
          trafficCount++
        }
      })

      // Identifica o objetivo predominante da conta
      if (salesCount > 0 && salesCount >= leadCount && salesCount >= msgCount) {
        setAutoDetectedObjective({ id: 'OUTCOME_SALES', name: 'Vendas & Conversões (E-commerce / Site)' })
      } else if (msgCount > 0 && msgCount >= leadCount) {
        setAutoDetectedObjective({ id: 'MESSAGES', name: 'Mensagens / WhatsApp' })
      } else if (leadCount > 0) {
        setAutoDetectedObjective({ id: 'OUTCOME_LEADS', name: 'Geração de Leads' })
      } else if (trafficCount > 0) {
        setAutoDetectedObjective({ id: 'OUTCOME_TRAFFIC', name: 'Tráfego & Cliques' })
      }
    }
  }, [campaigns, hasUserManuallySelected])

  // Filtragem das campanhas conforme o objetivo ativo
  const filteredCampaigns = useMemo(() => {
    if (selectedObjective === 'ALL') return campaigns
    if (selectedObjective === 'MESSAGES') {
      return campaigns.filter(c => c.objective.includes('ENGAGEMENT') || c.objective.includes('MESSAGES') || (c.messages && c.messages > 0))
    }
    if (selectedObjective === 'OUTCOME_SALES') {
      return campaigns.filter(c => c.objective.includes('SALE') || c.objective.includes('CONVERSION') || (c.purchases && c.purchases > 0) || (c.purchaseValue && c.purchaseValue > 0))
    }
    return campaigns.filter(c => c.objective === selectedObjective)
  }, [campaigns, selectedObjective])

  // Contagens por status para as abas da tabela
  const activeCount = useMemo(() => filteredCampaigns.filter(c => c.status === 'ACTIVE').length, [filteredCampaigns])
  const pausedCount = useMemo(() => filteredCampaigns.filter(c => c.status === 'PAUSED').length, [filteredCampaigns])
  const archivedCount = useMemo(() => filteredCampaigns.filter(c => c.status === 'ARCHIVED').length, [filteredCampaigns])

  const displayedCampaigns = useMemo(() => {
    return filteredCampaigns.filter(c => {
      if (tableStatusTab === 'ACTIVE') return c.status === 'ACTIVE'
      if (tableStatusTab === 'PAUSED') return c.status === 'PAUSED'
      if (tableStatusTab === 'ARCHIVED') return c.status === 'ARCHIVED'
      return true
    })
  }, [filteredCampaigns, tableStatusTab])

  // Cálculos consolidados das métricas filtradas
  const totalSpend = filteredCampaigns.reduce((sum, c) => sum + (c.spend || 0), 0)
  const totalImpressions = filteredCampaigns.reduce((sum, c) => sum + (c.impressions || 0), 0)
  const totalClicks = filteredCampaigns.reduce((sum, c) => sum + (c.clicks || 0), 0)
  const totalMessages = filteredCampaigns.reduce((sum, c) => sum + (c.messages || 0), 0)
  const totalLeads = filteredCampaigns.reduce((sum, c) => sum + (c.leads || 0), 0)
  const totalPurchases = filteredCampaigns.reduce((sum, c) => sum + (c.purchases || 0), 0)
  const totalPurchaseValue = filteredCampaigns.reduce((sum, c) => sum + (c.purchaseValue || 0), 0)

  // Métricas calculadas para Vendas e ROAS
  const effectiveRoas = totalSpend > 0 && totalPurchaseValue > 0 
    ? totalPurchaseValue / totalSpend 
    : (filteredCampaigns.length > 0 ? filteredCampaigns.reduce((sum, c) => sum + (c.roas || 0), 0) / filteredCampaigns.length : 0)

  const totalNetProfit = totalPurchaseValue > 0 ? totalPurchaseValue - totalSpend : 0
  const avgTicket = totalPurchases > 0 && totalPurchaseValue > 0 ? totalPurchaseValue / totalPurchases : 0
  const costPerPurchase = totalPurchases > 0 ? totalSpend / totalPurchases : 0

  const avgCtr = filteredCampaigns.length > 0
    ? filteredCampaigns.reduce((sum, c) => sum + (c.ctr || 0), 0) / filteredCampaigns.length
    : 0
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0
  const costPerMessage = totalMessages > 0 ? totalSpend / totalMessages : 0
  const costPerLead = totalLeads > 0 ? totalSpend / totalLeads : 0

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

  const isSalesMode = selectedObjective === 'OUTCOME_SALES'
  const isMessageMode = selectedObjective === 'MESSAGES'
  const isLeadMode = selectedObjective === 'OUTCOME_LEADS'

  return (
    <div className="space-y-6">
      {/* Header */}
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
          <p className="text-muted-foreground mt-1">Métricas inteligentes adaptadas dinamicamente ao objetivo das suas campanhas</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={datePreset} onValueChange={(val) => { setDatePreset(val); }}>
            <SelectTrigger className="w-[170px] h-9">
              <Calendar className="h-4 w-4 mr-2 text-primary" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="maximum">Todo o período</SelectItem>
              <SelectItem value="last_30d">Últimos 30 dias</SelectItem>
              <SelectItem value="last_14d">Últimos 14 dias</SelectItem>
              <SelectItem value="last_7d">Últimos 7 dias</SelectItem>
              <SelectItem value="this_month">Este mês</SelectItem>
              <SelectItem value="last_month">Mês passado</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="yesterday">Ontem</SelectItem>
            </SelectContent>
          </Select>

          {mounted && settings.hasFbKeys() && (
            <Button variant="outline" size="sm" onClick={() => loadRealData(datePreset)} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Sincronizar
            </Button>
          )}

          <ExportReportModal
            campaigns={campaigns}
            datePreset={datePreset}
            totalSpend={totalSpend}
            totalPurchaseValue={totalPurchaseValue}
            effectiveRoas={effectiveRoas}
            totalPurchases={totalPurchases}
            totalMessages={totalMessages}
            totalLeads={totalLeads}
            totalClicks={totalClicks}
          />
        </div>
      </div>

      {/* Quick Launch Banner: Guardião & Criativos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link href="/dashboard/guardian" className="group">
          <div className="p-3.5 rounded-xl border bg-card/60 hover:bg-card hover:border-primary/40 transition-all flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  Guardião Anti-Prejuízo
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.2 rounded font-normal">Monitorando</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Stop-loss de anúncios e controle de CPA máximo</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
        </Link>

        <Link href="/dashboard/creatives" className="group">
          <div className="p-3.5 rounded-xl border bg-card/60 hover:bg-card hover:border-primary/40 transition-all flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  Galeria de Criativos & Fadiga
                  <span className="text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.2 rounded font-normal">Radar</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Ranking de campeões e detector de saturação</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
        </Link>
      </div>

      {/* Auto-Detection Indicator & Filter by Objective */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-card border gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4 text-primary" />
            <span>Filtrar Métricas por Objetivo da Campanha:</span>
          </div>
          {autoDetectedObjective && selectedObjective === 'ALL' && (
            <div className="flex items-center gap-2 pt-0.5">
              <p className="text-xs text-primary flex items-center gap-1 font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                Foco sugerido: <strong>{autoDetectedObjective.name}</strong>
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => {
                  setSelectedObjective(autoDetectedObjective.id)
                  setHasUserManuallySelected(true)
                }}
              >
                Ativar Modo
              </Button>
            </div>
          )}
          {selectedObjective !== 'ALL' && (
            <p className="text-xs text-muted-foreground flex items-center gap-2 pt-0.5">
              <span>Filtrado por: <strong>{selectedObjective}</strong> ({filteredCampaigns.length} de {campaigns.length} campanhas)</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1 text-xs text-primary underline"
                onClick={() => {
                  setSelectedObjective('ALL')
                  setHasUserManuallySelected(true)
                }}
              >
                Ver todas ({campaigns.length})
              </Button>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select 
            value={selectedObjective} 
            onValueChange={(val) => {
              setSelectedObjective(val)
              setHasUserManuallySelected(true)
            }}
          >
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder="Selecione o Objetivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">🌐 Todos os Objetivos (Visão Geral)</SelectItem>
              <SelectItem value="OUTCOME_SALES">🛍️ Vendas & Conversões (E-commerce / ROAS)</SelectItem>
              <SelectItem value="MESSAGES">💬 Mensagens / WhatsApp / Direct</SelectItem>
              <SelectItem value="OUTCOME_LEADS">📋 Geração de Leads</SelectItem>
              <SelectItem value="OUTCOME_TRAFFIC">🚀 Tráfego & Cliques</SelectItem>
              <SelectItem value="OUTCOME_AWARENESS">📢 Alcance & Branding</SelectItem>
            </SelectContent>
          </Select>

          {hasUserManuallySelected && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setHasUserManuallySelected(false)
                setSelectedObjective('ALL')
              }}
              className="text-xs text-muted-foreground"
            >
              Resetar
            </Button>
          )}
        </div>
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

      {/* AVISO QUANDO FOR MODO VENDAS SEM VALOR MONETÁRIO NO PIXEL */}
      {isSalesMode && totalPurchases > 0 && totalPurchaseValue === 0 && (
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm flex items-start gap-3">
          <Info className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Vendas registradas sem valor monetário (currency / value)</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Detectamos <strong>{totalPurchases} compras</strong> registradas no seu Pixel/CAPI, porém sem o envio do valor em Reais de cada transação. O ROAS necessita do valor da receita gerada para ser calculado automaticamente.
            </p>
          </div>
        </div>
      )}

      {/* DASHBOARD ADAPTADO: MODO VENDAS & E-COMMERCE (COM INVESTIMENTO, RETORNO E ROAS) */}
      {isSalesMode ? (
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" /> Painel de Retorno sobre Investimento (Vendas & ROAS)
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Valor Investido */}
              <KpiCard
                title="Valor Investido (Gasto)"
                value={formatCurrency(totalSpend)}
                icon={DollarSign}
                badge="Investimento Total"
                isHighlight={true}
              />

              {/* Retorno das Vendas (Receita) */}
              <KpiCard
                title="Retorno das Vendas (Receita)"
                value={totalPurchaseValue > 0 ? formatCurrency(totalPurchaseValue) : (totalPurchases > 0 ? `${totalPurchases} compras` : 'R$ 0,00')}
                icon={TrendingUp}
                badge={totalPurchaseValue > 0 ? "Faturamento Pixel" : "Vendas"}
                isHighlight={totalPurchaseValue > 0}
                subtitle={totalPurchaseValue > 0 && totalPurchases > 0 ? `Ticket Médio: ${formatCurrency(avgTicket)}` : undefined}
              />

              {/* ROAS Real */}
              <KpiCard
                title="ROAS Real da Conta"
                value={effectiveRoas > 0 ? `${effectiveRoas.toFixed(2)}x` : '—'}
                icon={TrendingUp}
                badge="Retorno / Investimento"
                isHighlight={effectiveRoas >= 2}
                subtitle={effectiveRoas > 0 ? `R$ ${effectiveRoas.toFixed(2)} gerados a cada R$ 1 gasto` : undefined}
              />

              {/* Lucro Bruto dos Anúncios */}
              <KpiCard
                title="Lucro Bruto dos Anúncios"
                value={totalPurchaseValue > 0 ? formatCurrency(totalNetProfit) : '—'}
                icon={Target}
                badge="Retorno - Investimento"
                subtitle={totalPurchaseValue > 0 ? (totalNetProfit >= 0 ? 'Resultado Positivo' : 'Investimento maior que retorno') : undefined}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard
              title="Vendas Realizadas (Compras)"
              value={formatNumber(totalPurchases)}
              icon={ShoppingBag}
              badge="Conversões"
              subtitle={costPerPurchase > 0 ? `CPA (Custo p/ Compra): ${formatCurrency(costPerPurchase)}` : undefined}
            />
            <KpiCard
              title="Cliques no Link"
              value={formatNumber(totalClicks)}
              icon={MousePointer}
              badge="Tráfego"
              subtitle={avgCpc > 0 ? `CPC Médio: ${formatCurrency(avgCpc)}` : undefined}
            />
            <KpiCard
              title="Taxa de Cliques (CTR)"
              value={formatPercent(avgCtr)}
              icon={BarChart3}
              badge="Engajamento"
            />
          </div>
        </div>
      ) : (
        /* GRID DE MÉTRICAS MODULARES / OUTROS OBJETIVOS */
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Métricas Principais ({selectedObjective === 'ALL' ? 'Todas as Campanhas' : selectedObjective})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

            {/* WhatsApp / Direct */}
            <KpiCard
              title="Mensagens Iniciadas (WhatsApp)"
              value={formatNumber(totalMessages)}
              icon={MessageSquare}
              badge="WhatsApp / Direct"
              isApplicable={selectedObjective === 'ALL' || isMessageMode}
              isHighlight={isMessageMode}
              subtitle={costPerMessage > 0 ? `Custo p/ Msg: ${formatCurrency(costPerMessage)}` : undefined}
            />

            {/* Leads */}
            <KpiCard
              title="Leads Gerados"
              value={formatNumber(totalLeads)}
              icon={Users}
              badge="Leads"
              isApplicable={selectedObjective === 'ALL' || isLeadMode}
              isHighlight={isLeadMode}
              subtitle={costPerLead > 0 ? `CPL: ${formatCurrency(costPerLead)}` : undefined}
            />

            {/* Vendas & ROAS quando em visão geral */}
            <KpiCard
              title="Vendas / Conversões"
              value={formatNumber(totalPurchases)}
              icon={ShoppingBag}
              badge="Vendas"
            />
            <KpiCard
              title="ROAS Médio"
              value={effectiveRoas > 0 ? `${effectiveRoas.toFixed(2)}x` : '—'}
              icon={TrendingUp}
              badge="Vendas"
            />

            {/* Tráfego */}
            <KpiCard
              title="Cliques no Link"
              value={formatNumber(totalClicks)}
              icon={MousePointer}
              badge="Tráfego"
            />
            <KpiCard
              title="CTR Médio"
              value={formatPercent(avgCtr)}
              icon={BarChart3}
              badge="Tráfego"
            />
          </div>
        </div>
      )}

      {/* Gráfico de Performance */}
      <PerformanceChart data={dailyMetrics} />

      {/* Tabela Detalhada das Campanhas com Guia Separada para Arquivadas */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">Campanhas</h2>
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
              {displayedCampaigns.length} de {filteredCampaigns.length} exibidas
            </span>
          </div>
          {filteredCampaigns.length !== campaigns.length && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => {
                setSelectedObjective('ALL')
                setHasUserManuallySelected(true)
              }}
            >
              Exibir todas as {campaigns.length} campanhas
            </Button>
          )}
        </div>

        {/* GUIAS SEPARADAS (RODANDO / PAUSADAS / ARQUIVADAS / TODAS) */}
        <Tabs value={tableStatusTab} onValueChange={(val) => setTableStatusTab(val as any)} className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto h-auto p-1 bg-muted/80 gap-1 border">
            <TabsTrigger 
              value="ACTIVE" 
              className="flex items-center justify-center gap-2 py-1.5 px-3 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:text-emerald-500 font-medium"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Rodando / Ativas</span>
              <Badge variant="secondary" className="ml-1 text-[11px] px-1.5 py-0 h-4 font-mono font-semibold">
                {activeCount}
              </Badge>
            </TabsTrigger>

            <TabsTrigger 
              value="PAUSED" 
              className="flex items-center justify-center gap-2 py-1.5 px-3 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:text-amber-500 font-medium"
            >
              <PauseCircle className="h-3.5 w-3.5" />
              <span>Pausadas</span>
              <Badge variant="secondary" className="ml-1 text-[11px] px-1.5 py-0 h-4 font-mono">
                {pausedCount}
              </Badge>
            </TabsTrigger>

            <TabsTrigger 
              value="ARCHIVED" 
              className="flex items-center justify-center gap-2 py-1.5 px-3 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:text-muted-foreground font-medium"
            >
              <Archive className="h-3.5 w-3.5" />
              <span>Arquivadas</span>
              <Badge variant="secondary" className="ml-1 text-[11px] px-1.5 py-0 h-4 font-mono">
                {archivedCount}
              </Badge>
            </TabsTrigger>

            <TabsTrigger 
              value="ALL" 
              className="flex items-center justify-center gap-2 py-1.5 px-3 text-xs sm:text-sm data-[state=active]:bg-background font-medium"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Todas</span>
              <Badge variant="secondary" className="ml-1 text-[11px] px-1.5 py-0 h-4 font-mono">
                {filteredCampaigns.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {tableStatusTab === 'ACTIVE' && activeCount === 0 && filteredCampaigns.length > 0 && (
          <div className="p-4 rounded-xl border bg-muted/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
            <div>
              <p className="font-semibold text-foreground">Nenhuma campanha ativa em veiculação no momento.</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Você possui <strong>{pausedCount}</strong> campanha(s) pausada(s) e <strong>{archivedCount}</strong> arquivada(s).
              </p>
            </div>
            <div className="flex gap-2">
              {pausedCount > 0 && (
                <Button size="sm" variant="outline" onClick={() => setTableStatusTab('PAUSED')}>
                  Ver Pausadas ({pausedCount})
                </Button>
              )}
              {archivedCount > 0 && (
                <Button size="sm" variant="ghost" onClick={() => setTableStatusTab('ARCHIVED')}>
                  Ver Arquivadas ({archivedCount})
                </Button>
              )}
            </div>
          </div>
        )}

        <CampaignTable campaigns={displayedCampaigns} onStatusChange={handleStatusChange} />
      </div>
    </div>
  )
}
