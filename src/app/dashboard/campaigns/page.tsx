'use client'

import { useEffect, useState, useMemo } from 'react'
import { CampaignTable } from '@/components/dashboard/campaign-table'
import type { Campaign } from '@/lib/mock-data'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Search, RefreshCw, AlertCircle, Calendar, Archive, PauseCircle, Layers } from 'lucide-react'
import { useSettings } from '@/lib/store'
import { Button } from '@/components/ui/button'

export default function CampaignsPage() {
  const settings = useSettings()
  const [mounted, setMounted] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'ALL'>('ACTIVE')
  const [objectiveFilter, setObjectiveFilter] = useState<string>('all')
  const [datePreset, setDatePreset] = useState<string>('maximum')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isRealData, setIsRealData] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const loadRealCampaigns = async (preset = datePreset, overrideAccountId?: string, forceRefresh = false) => {
    const targetAccountId = overrideAccountId || settings.fbAdAccountId
    if (!settings.fbAccessToken && !settings.useAdminFbToken) return
    if (!targetAccountId) return

    setIsLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/facebook/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: settings.fbAccessToken,
          adAccountId: targetAccountId,
          useAdminToken: settings.useAdminFbToken,
          datePreset: preset,
          refresh: forceRefresh,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Não foi possível carregar campanhas da API do Facebook.')
        setIsRealData(false)
      } else {
        setCampaigns(data.campaigns || [])
        setIsRealData(true)
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro de conexão')
      setIsRealData(false)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (mounted && (settings.useAdminFbToken || settings.fbAccessToken) && settings.fbAdAccountId) {
      loadRealCampaigns(datePreset)
    }
  }, [mounted, settings.fbAccessToken, settings.fbAdAccountId, settings.useAdminFbToken, datePreset])

  // Atualização instantânea ao trocar conta no Topbar
  useEffect(() => {
    const handleAccountSwitched = (e: Event) => {
      const customEvent = e as CustomEvent<{ adAccountId: string }>
      if (customEvent.detail?.adAccountId) {
        loadRealCampaigns(datePreset, customEvent.detail.adAccountId)
      }
    }
    window.addEventListener('adpilot:account-switched', handleAccountSwitched)
    return () => window.removeEventListener('adpilot:account-switched', handleAccountSwitched)
  }, [datePreset, settings.fbAccessToken, settings.useAdminFbToken])

  // Contagens por status real
  const activeCount = useMemo(() => campaigns.filter(c => c.status === 'ACTIVE').length, [campaigns])
  const pausedCount = useMemo(() => campaigns.filter(c => c.status === 'PAUSED').length, [campaigns])
  const archivedCount = useMemo(() => campaigns.filter(c => c.status === 'ARCHIVED').length, [campaigns])

  const filtered = useMemo(() => {
    return campaigns.filter(c => {
      // Filtro por Guia / Aba
      if (activeTab === 'ACTIVE' && c.status !== 'ACTIVE') return false
      if (activeTab === 'PAUSED' && c.status !== 'PAUSED') return false
      if (activeTab === 'ARCHIVED' && c.status !== 'ARCHIVED') return false
      if (activeTab === 'ALL' && c.status === 'ARCHIVED') return false // Arquivadas ficam isoladas estritamente na sua guia dedicada!

      // Busca por nome
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false

      // Filtro de objetivo
      if (objectiveFilter !== 'all' && c.objective !== objectiveFilter) return false

      return true
    })
  }, [campaigns, activeTab, search, objectiveFilter])

  const handleStatusChange = (id: string, newStatus: 'ACTIVE' | 'PAUSED') => {
    setCampaigns(prev =>
      prev.map(c => (c.id === id ? { ...c, status: newStatus } : c))
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Campanhas
            {isRealData && (
              <span className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-normal px-2.5 py-0.5 rounded-full">
                ● Facebook API Conectado
              </span>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie suas campanhas ativas, pausadas e arquivadas em guias dedicadas</p>
        </div>

        {mounted && settings.hasFbKeys() && (
          <Button variant="outline" size="sm" onClick={() => loadRealCampaigns(datePreset, undefined, true)} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* GUIAS SEPARADAS (RODANDO / PAUSADAS / ARQUIVADAS / TODAS) */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto h-auto p-1 bg-muted/80 gap-1 border">
          <TabsTrigger 
            value="ACTIVE" 
            className="flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:text-emerald-500 font-medium"
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
            className="flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:text-amber-500 font-medium"
          >
            <PauseCircle className="h-3.5 w-3.5" />
            <span>Pausadas</span>
            <Badge variant="secondary" className="ml-1 text-[11px] px-1.5 py-0 h-4 font-mono">
              {pausedCount}
            </Badge>
          </TabsTrigger>

          <TabsTrigger 
            value="ARCHIVED" 
            className="flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:text-muted-foreground font-medium"
          >
            <Archive className="h-3.5 w-3.5" />
            <span>Arquivadas (Histórico)</span>
            <Badge variant="secondary" className="ml-1 text-[11px] px-1.5 py-0 h-4 font-mono">
              {archivedCount}
            </Badge>
          </TabsTrigger>

          <TabsTrigger 
            value="ALL" 
            className="flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm data-[state=active]:bg-background font-medium"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Todas (Ativas + Pausadas)</span>
            <Badge variant="secondary" className="ml-1 text-[11px] px-1.5 py-0 h-4 font-mono">
              {activeCount + pausedCount}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters (Busca, Período e Objetivo) */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Buscar em ${activeTab === 'ACTIVE' ? 'ativas' : activeTab === 'PAUSED' ? 'pausadas' : activeTab === 'ARCHIVED' ? 'arquivadas' : 'todas'} por nome...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={datePreset} onValueChange={setDatePreset}>
            <SelectTrigger className="w-[170px]">
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

          <Select value={objectiveFilter} onValueChange={setObjectiveFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Objetivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Objetivos</SelectItem>
              <SelectItem value="OUTCOME_TRAFFIC">Tráfego</SelectItem>
              <SelectItem value="OUTCOME_SALES">Vendas</SelectItem>
              <SelectItem value="OUTCOME_LEADS">Leads</SelectItem>
              <SelectItem value="OUTCOME_AWARENESS">Alcance</SelectItem>
              <SelectItem value="OUTCOME_ENGAGEMENT">Engajamento</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          Mostrando <strong>{filtered.length}</strong> {activeTab === 'ACTIVE' ? 'campanhas ativas' : activeTab === 'PAUSED' ? 'campanhas pausadas' : activeTab === 'ARCHIVED' ? 'campanhas arquivadas' : 'campanhas'}
          {campaigns.length > 0 && ` (de ${campaigns.length} totais)`}
        </span>
        {objectiveFilter !== 'all' || search ? (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs text-primary" 
            onClick={() => { setObjectiveFilter('all'); setSearch(''); }}
          >
            Limpar busca/filtros
          </Button>
        ) : null}
      </div>

      {/* Alerta didático caso a aba de ativas esteja vazia */}
      {activeTab === 'ACTIVE' && activeCount === 0 && campaigns.length > 0 && (
        <div className="p-4 rounded-xl border bg-muted/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
          <div>
            <p className="font-semibold text-foreground">Nenhuma campanha ativa em veiculação no momento.</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Você possui <strong>{pausedCount}</strong> campanha(s) pausada(s) e <strong>{archivedCount}</strong> arquivada(s).
            </p>
          </div>
          <div className="flex gap-2">
            {pausedCount > 0 && (
              <Button size="sm" variant="outline" onClick={() => setActiveTab('PAUSED')}>
                Ver Pausadas ({pausedCount})
              </Button>
            )}
            {archivedCount > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setActiveTab('ARCHIVED')}>
                Ver Arquivadas ({archivedCount})
              </Button>
            )}
          </div>
        </div>
      )}

      <CampaignTable campaigns={filtered} onStatusChange={handleStatusChange} />
    </div>
  )
}


