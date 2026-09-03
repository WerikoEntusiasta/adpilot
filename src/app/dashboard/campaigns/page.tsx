'use client'

import { useEffect, useState, useMemo } from 'react'
import { CampaignTable } from '@/components/dashboard/campaign-table'
import { mockCampaigns, type Campaign } from '@/lib/mock-data'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter, RefreshCw, AlertCircle } from 'lucide-react'
import { useSettings } from '@/lib/store'
import { Button } from '@/components/ui/button'

export default function CampaignsPage() {
  const settings = useSettings()
  const [mounted, setMounted] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [objectiveFilter, setObjectiveFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isRealData, setIsRealData] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const loadRealCampaigns = async () => {
    if (!settings.hasFbKeys()) return
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/facebook/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: settings.fbAccessToken,
          adAccountId: settings.fbAdAccountId,
          useAdminToken: settings.useAdminFbToken,
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
    if (mounted && settings.hasFbKeys()) {
      loadRealCampaigns()
    }
  }, [mounted, settings.fbAccessToken, settings.fbAdAccountId])

  const filtered = useMemo(() => {
    return campaigns.filter(c => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (objectiveFilter !== 'all' && c.objective !== objectiveFilter) return false
      return true
    })
  }, [campaigns, search, statusFilter, objectiveFilter])

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
          <p className="text-muted-foreground mt-1">Gerencie e monitore todas as suas campanhas de anúncios</p>
        </div>

        {mounted && settings.hasFbKeys() && (
          <Button variant="outline" size="sm" onClick={loadRealCampaigns} disabled={isLoading}>
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar campanha por nome..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="ACTIVE">Ativas</SelectItem>
              <SelectItem value="PAUSED">Pausadas</SelectItem>
              <SelectItem value="ARCHIVED">Arquivadas</SelectItem>
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

      <CampaignTable campaigns={filtered} onStatusChange={handleStatusChange} />
    </div>
  )
}
