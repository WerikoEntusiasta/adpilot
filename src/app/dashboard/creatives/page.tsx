'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSettings } from '@/lib/store'
import type { CreativeItem } from '@/app/api/facebook/creatives/route'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Trophy,
  Flame,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Calendar,
  Layers,
  Sparkles,
  TrendingUp,
  Eye,
  MousePointer,
  DollarSign,
  Play,
  Pause,
  ExternalLink,
  Zap,
  Info,
  Maximize2
} from 'lucide-react'

export default function CreativesPage() {
  const settings = useSettings()
  const [mounted, setMounted] = useState(false)
  const [creatives, setCreatives] = useState<CreativeItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRealData, setIsRealData] = useState(false)
  const [search, setSearch] = useState('')
  const [datePreset, setDatePreset] = useState('maximum')
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'WARNING_OR_FATIGUED' | 'WINNERS'>('ALL')
  const [sortBy, setSortBy] = useState<'roas' | 'cpa' | 'ctr' | 'clicks' | 'frequency' | 'spend'>('roas')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [selectedPreview, setSelectedPreview] = useState<CreativeItem | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const loadCreatives = async (preset = datePreset) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/facebook/creatives', {
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
      setCreatives(data.creatives || [])
      setIsRealData(!!data.isRealData)
    } catch (err) {
      console.error('Erro ao carregar criativos:', err)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (mounted) {
      loadCreatives(datePreset)
    }
  }, [mounted, settings.fbAccessToken, settings.fbAdAccountId, datePreset])

  const handleToggleAdStatus = async (item: CreativeItem) => {
    setActionLoadingId(item.id)
    const newStatus = item.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    try {
      const res = await fetch('/api/facebook/guardian/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: settings.fbAccessToken,
          adAccountId: settings.fbAdAccountId,
          useAdminToken: settings.useAdminFbToken,
          adId: item.id,
          status: newStatus,
        }),
      })
      if (res.ok) {
        setCreatives(prev =>
          prev.map(c => (c.id === item.id ? { ...c, status: newStatus } : c))
        )
      }
    } catch (err) {
      console.error('Erro ao alterar status:', err)
    }
    setActionLoadingId(null)
  }

  // Métricas consolidadas de fadiga
  const healthyCount = useMemo(() => creatives.filter(c => c.fatigueStatus === 'HEALTHY').length, [creatives])
  const warningCount = useMemo(() => creatives.filter(c => c.fatigueStatus === 'WARNING').length, [creatives])
  const fatiguedCount = useMemo(() => creatives.filter(c => c.fatigueStatus === 'FATIGUED').length, [creatives])
  const winnersCount = useMemo(() => creatives.filter(c => c.badges.some(b => b.includes('ROAS') || b.includes('CPA') || b.includes('Mais'))).length, [creatives])

  // Filtragem e ordenação dos criativos
  const filteredAndSorted = useMemo(() => {
    let result = creatives.filter(c => {
      if (activeTab === 'ACTIVE' && c.status !== 'ACTIVE') return false
      if (activeTab === 'WARNING_OR_FATIGUED' && c.fatigueStatus === 'HEALTHY') return false
      if (activeTab === 'WINNERS' && !c.badges.some(b => b.includes('ROAS') || b.includes('Conversões') || b.includes('Cliques'))) return false

      if (search) {
        const query = search.toLowerCase()
        const matchTitle = c.title.toLowerCase().includes(query)
        const matchName = c.name.toLowerCase().includes(query)
        const matchBody = c.body.toLowerCase().includes(query)
        if (!matchTitle && !matchName && !matchBody) return false
      }
      return true
    })

    result.sort((a, b) => {
      if (sortBy === 'roas') return (b.roas || 0) - (a.roas || 0)
      if (sortBy === 'cpa') {
        const aCpa = a.cpa > 0 ? a.cpa : 999999
        const bCpa = b.cpa > 0 ? b.cpa : 999999
        return aCpa - bCpa
      }
      if (sortBy === 'ctr') return (b.ctr || 0) - (a.ctr || 0)
      if (sortBy === 'clicks') return (b.clicks || 0) - (a.clicks || 0)
      if (sortBy === 'frequency') return (b.frequency || 0) - (a.frequency || 0)
      if (sortBy === 'spend') return (b.spend || 0) - (a.spend || 0)
      return 0
    })

    return result
  }, [creatives, activeTab, search, sortBy])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-7 w-7 text-amber-500" />
            Galeria de Criativos & Fadiga
            {isRealData ? (
              <span className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-normal px-2.5 py-0.5 rounded-full">
                ● Facebook Ads Sincronizado
              </span>
            ) : (
              <span className="text-xs bg-muted text-muted-foreground font-normal px-2.5 py-0.5 rounded-full">
                Modo Demonstração
              </span>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            Ranking visual dos melhores anúncios e monitoramento de saturação de audiência em tempo real
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={datePreset} onValueChange={setDatePreset}>
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
              <SelectItem value="today">Hoje</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => loadCreatives(datePreset)} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
        </div>
      </div>

      {/* Resumo da Saúde dos Criativos (Fadiga Radar) */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border bg-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              Total Analisado
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold">{creatives.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Criativos da conta avaliados</p>
          </CardContent>
        </Card>

        <Card className="border bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
              Saudáveis & Frescos
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{healthyCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Frequência ideal & entrega alta</p>
          </CardContent>
        </Card>

        <Card className="border bg-amber-500/5 border-amber-500/20">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center justify-between">
              Sinais de Atenção
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{warningCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Frequência subindo (2.2x a 3.5x)</p>
          </CardContent>
        </Card>

        <Card className="border bg-red-500/5 border-red-500/20">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center justify-between">
              Saturados / Fadigados
              <Flame className="h-4 w-4 text-red-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{fatiguedCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Público esgotado & risco de queima</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerta de fadiga se houver criativos críticos */}
      {fatiguedCount > 0 && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-red-500" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">
              Atenção: Detectamos {fatiguedCount} criativo(s) fadigado(s) com frequência crítica.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Quando a mesma pessoa visualiza o anúncio repetidas vezes sem converter, o CTR cai e o custo por resultado sobe. Recomendamos pausar esses anúncios ou renovar o vídeo/imagem imediatamente.
            </p>
          </div>
        </div>
      )}

      {/* Filtros e Abas */}
      <div className="space-y-3">
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto h-auto p-1 bg-muted/80 gap-1 border">
            <TabsTrigger value="ALL" className="py-2 text-xs sm:text-sm">
              <Layers className="h-3.5 w-3.5 mr-1.5" />
              Todos ({creatives.length})
            </TabsTrigger>
            <TabsTrigger value="WINNERS" className="py-2 text-xs sm:text-sm text-amber-500">
              <Trophy className="h-3.5 w-3.5 mr-1.5" />
              Campeões ({winnersCount})
            </TabsTrigger>
            <TabsTrigger value="ACTIVE" className="py-2 text-xs sm:text-sm text-emerald-500">
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              Ativos ({creatives.filter(c => c.status === 'ACTIVE').length})
            </TabsTrigger>
            <TabsTrigger value="WARNING_OR_FATIGUED" className="py-2 text-xs sm:text-sm text-red-500">
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
              Fadiga ({warningCount + fatiguedCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar criativo por título, texto ou nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Ordenar por:</span>
            <Select value={sortBy} onValueChange={(val) => setSortBy(val as any)}>
              <SelectTrigger className="w-full sm:w-[190px]">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="roas">🏆 Maior ROAS</SelectItem>
                <SelectItem value="cpa">🎯 Menor Custo p/ Conversão</SelectItem>
                <SelectItem value="ctr">⚡ Maior CTR (%)</SelectItem>
                <SelectItem value="clicks">🔥 Mais Cliques</SelectItem>
                <SelectItem value="frequency">🚨 Maior Frequência (Fadiga)</SelectItem>
                <SelectItem value="spend">💰 Maior Investimento</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Grid Visual de Criativos */}
      {filteredAndSorted.length === 0 ? (
        <div className="p-12 text-center border rounded-xl bg-card space-y-3">
          <p className="text-sm font-semibold text-muted-foreground">Nenhum criativo encontrado com os filtros atuais.</p>
          <Button variant="outline" size="sm" onClick={() => { setSearch(''); setActiveTab('ALL'); }}>
            Limpar filtros
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSorted.map((item) => (
            <Card key={item.id} className="overflow-hidden border bg-card flex flex-col justify-between hover:shadow-md transition-shadow">
              {/* Topo do Card com Imagem / Thumbnail em Alta Resolução */}
              <div>
                <div
                  className="relative aspect-video w-full bg-muted/60 overflow-hidden border-b flex items-center justify-center cursor-pointer group/media"
                  onClick={() => setSelectedPreview(item)}
                  title="Clique para ampliar em Alta Resolução"
                >
                  {item.imageUrl || item.thumbnailUrl ? (
                    <img
                      src={item.imageUrl || item.thumbnailUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover/media:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-1.5 p-4 text-center">
                      <Play className="h-8 w-8 text-primary/60" />
                      <span className="text-xs">Mídia do Anúncio</span>
                    </div>
                  )}

                  {/* Hover Zoom Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-medium text-xs backdrop-blur-[2px]">
                    <Maximize2 className="h-4 w-4" />
                    <span>Ampliar em Alta Resolução</span>
                  </div>

                  {/* Badges no Criativo */}
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    {item.badges.map((badge, idx) => (
                      <span
                        key={idx}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-sm ${
                          badge.includes('ROAS')
                            ? 'bg-amber-500 text-black'
                            : badge.includes('Fadigado')
                            ? 'bg-red-600 text-white'
                            : badge.includes('Atenção')
                            ? 'bg-amber-500 text-black'
                            : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        {badge}
                      </span>
                    ))}
                  </div>

                  {/* Status Toggle Badge */}
                  <div className="absolute top-2 right-2">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shadow-sm backdrop-blur-md ${
                        item.status === 'ACTIVE'
                          ? 'bg-emerald-500/90 text-white'
                          : 'bg-zinc-800/90 text-zinc-300'
                      }`}
                    >
                      {item.status === 'ACTIVE' ? '● Ativo' : '⏸ Pausado'}
                    </span>
                  </div>
                </div>

                {/* Conteúdo do Card */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-sm line-clamp-1 text-foreground" title={item.title}>
                      {item.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1" title={item.body}>
                      {item.body}
                    </p>
                  </div>

                  {/* Indicador de Saúde do Criativo (Fadiga) */}
                  <div className="p-2.5 rounded-lg border bg-muted/30 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium flex items-center gap-1.5">
                        {item.fatigueStatus === 'HEALTHY' && (
                          <>
                            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                            <span className="text-emerald-500 font-semibold">Saudável</span>
                          </>
                        )}
                        {item.fatigueStatus === 'WARNING' && (
                          <>
                            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                            <span className="text-amber-500 font-semibold">Atenção</span>
                          </>
                        )}
                        {item.fatigueStatus === 'FATIGUED' && (
                          <>
                            <span className="h-2 w-2 rounded-full bg-red-500"></span>
                            <span className="text-red-500 font-semibold">Saturado / Fadigado</span>
                          </>
                        )}
                      </span>
                      <span className="text-muted-foreground font-mono text-[11px]">
                        Freq: <strong>{item.frequency.toFixed(2)}x</strong>
                      </span>
                    </div>

                    {/* Barra de Fadiga */}
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          item.fatigueStatus === 'FATIGUED'
                            ? 'bg-red-500'
                            : item.fatigueStatus === 'WARNING'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(15, item.fatigueScore))}%` }}
                      />
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-tight pt-0.5">
                      {item.fatigueReason}
                    </p>
                  </div>

                  {/* Grid de Métricas Principais */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                    <div className="p-2 rounded bg-muted/20 border">
                      <span className="text-[10px] text-muted-foreground block">ROAS</span>
                      <span className="font-bold text-emerald-500 font-mono">
                        {item.roas > 0 ? `${item.roas.toFixed(2)}x` : '—'}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-muted/20 border">
                      <span className="text-[10px] text-muted-foreground block">CPA / Custo</span>
                      <span className="font-bold font-mono">
                        {item.cpa > 0 ? formatCurrency(item.cpa) : '—'}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-muted/20 border">
                      <span className="text-[10px] text-muted-foreground block">CTR</span>
                      <span className="font-bold font-mono text-primary">
                        {formatPercent(item.ctr)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                    <span>Investido: <strong>{formatCurrency(item.spend)}</strong></span>
                    <span>Conversões: <strong>{item.conversions}</strong></span>
                  </div>
                </div>
              </div>

              {/* Ação Rápida no Rodapé */}
              <div className="p-4 pt-0">
                <Button
                  variant={item.status === 'ACTIVE' ? 'outline' : 'default'}
                  size="sm"
                  className="w-full h-8 text-xs gap-1.5"
                  onClick={() => handleToggleAdStatus(item)}
                  disabled={actionLoadingId === item.id}
                >
                  {actionLoadingId === item.id ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : item.status === 'ACTIVE' ? (
                    <>
                      <Pause className="h-3.5 w-3.5 text-amber-500" />
                      Pausar Anúncio
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 text-emerald-500" />
                      Reativar Anúncio
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Prévia em Alta Resolução */}
      <Dialog open={!!selectedPreview} onOpenChange={(open) => !open && setSelectedPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-6">
          {selectedPreview && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
                    {selectedPreview.status === 'ACTIVE' ? '● Veiculando' : '⏸ Pausado'}
                  </span>
                  <DialogTitle className="text-lg">{selectedPreview.title}</DialogTitle>
                </div>
              </DialogHeader>

              {/* Imagem Full Res */}
              <div className="rounded-xl overflow-hidden border bg-black/5 flex items-center justify-center max-h-[460px]">
                {selectedPreview.imageUrl || selectedPreview.thumbnailUrl ? (
                  <img
                    src={selectedPreview.imageUrl || selectedPreview.thumbnailUrl}
                    alt={selectedPreview.title}
                    className="w-full h-full object-contain max-h-[440px]"
                  />
                ) : (
                  <div className="p-16 text-center text-muted-foreground">Sem imagem disponível</div>
                )}
              </div>

              {/* Texto do anúncio */}
              <div className="p-4 rounded-xl border bg-muted/30 space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Texto Principal (Copy do Anúncio)
                </span>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedPreview.body}
                </p>
              </div>

              {/* Métricas do Anúncio */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg border bg-card">
                  <span className="text-muted-foreground block text-[11px]">ROAS da Peça</span>
                  <span className="text-base font-bold text-emerald-500 font-mono">
                    {selectedPreview.roas > 0 ? `${selectedPreview.roas.toFixed(2)}x` : '—'}
                  </span>
                </div>
                <div className="p-3 rounded-lg border bg-card">
                  <span className="text-muted-foreground block text-[11px]">Investimento Total</span>
                  <span className="text-base font-bold font-mono">{formatCurrency(selectedPreview.spend)}</span>
                </div>
                <div className="p-3 rounded-lg border bg-card">
                  <span className="text-muted-foreground block text-[11px]">Conversões</span>
                  <span className="text-base font-bold font-mono">{selectedPreview.conversions}</span>
                </div>
                <div className="p-3 rounded-lg border bg-card">
                  <span className="text-muted-foreground block text-[11px]">Frequência (Fadiga)</span>
                  <span className="text-base font-bold font-mono">{selectedPreview.frequency.toFixed(2)}x</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
