'use client'

import { use, useEffect, useState } from 'react'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { PerformanceChart } from '@/components/dashboard/performance-chart'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import { ArrowLeft, DollarSign, Eye, MousePointer, Target, TrendingUp, Calendar, Pause, Play, Loader2, Layers, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'
import { useSettings } from '@/lib/store'

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' }> = {
  ACTIVE: { label: 'Ativa', variant: 'success' },
  PAUSED: { label: 'Pausada', variant: 'warning' },
  ARCHIVED: { label: 'Arquivada', variant: 'secondary' },
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const settings = useSettings()
  const [mounted, setMounted] = useState(false)
  const [campaign, setCampaign] = useState<any>(null)
  const [dailyMetrics, setDailyMetrics] = useState<any[]>([])
  const [adSets, setAdSets] = useState<any[]>([])
  const [ads, setAds] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && settings.hasFbKeys()) {
      setIsLoading(true)

      // 1. Buscar visão geral da campanha
      const fetchGeneral = fetch('/api/facebook/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: settings.fbAccessToken,
          adAccountId: settings.fbAdAccountId,
          useAdminToken: settings.useAdminFbToken
        })
      })
      .then(r => r.json())
      .then(data => {
        if (data.campaigns) {
          const found = data.campaigns.find((c: any) => c.id === id)
          setCampaign(found)
        }
        if (data.dailyMetrics) {
          setDailyMetrics(data.dailyMetrics)
        }
      })

      // 2. Buscar AdSets e Criativos aprofundados
      const fetchDeep = fetch(`/api/facebook/campaigns/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: settings.fbAccessToken,
          adAccountId: settings.fbAdAccountId,
          useAdminToken: settings.useAdminFbToken
        })
      })
      .then(r => r.json())
      .then(data => {
        if (data.adSets) setAdSets(data.adSets)
        if (data.ads) setAds(data.ads)
      })

      Promise.all([fetchGeneral, fetchDeep])
        .catch(console.error)
        .finally(() => setIsLoading(false))
    } else if (mounted) {
      setIsLoading(false)
    }
  }, [mounted, id, settings.fbAccessToken, settings.fbAdAccountId, settings.useAdminFbToken])

  if (!mounted || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando dados da campanha, conjuntos e criativos...</p>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <p className="text-xl text-muted-foreground">Campanha não encontrada na sua conta do Facebook Ads.</p>
        <Button asChild>
          <Link href="/dashboard/campaigns">Voltar para campanhas</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/campaigns">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <Badge variant={statusConfig[campaign.status]?.variant || 'secondary'}>
              {statusConfig[campaign.status]?.label || campaign.status}
            </Badge>
          </div>
          <div className="flex items-center gap-4 ml-12 text-sm text-muted-foreground">
            <span>{campaign.objective}</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Início: {campaign.startDate}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="overview" className="gap-2">
            <Target className="h-4 w-4" /> Visão Geral
          </TabsTrigger>
          <TabsTrigger value="adsets" className="gap-2">
            <Layers className="h-4 w-4" /> Conjuntos de Anúncios ({adSets.length})
          </TabsTrigger>
          <TabsTrigger value="ads" className="gap-2">
            <ImageIcon className="h-4 w-4" /> Anúncios & Criativos ({ads.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: VISÃO GERAL */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard title="Gasto Total" value={formatCurrency(campaign.spend)} icon={DollarSign} />
            <KpiCard title="Vendas (Site)" value={formatNumber(campaign.purchases || 0)} icon={Target} />
            <KpiCard title="Leads (WhatsApp)" value={formatNumber(campaign.messages || 0)} icon={MousePointer} />
            <KpiCard title="ROAS" value={campaign.roas > 0 ? `${campaign.roas.toFixed(2)}x` : "—"} icon={TrendingUp} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard title="Impressões" value={formatNumber(campaign.impressions)} icon={Eye} />
            <KpiCard title="Cliques no Link" value={formatNumber(campaign.clicks)} icon={MousePointer} />
            <KpiCard title="CTR Médio" value={formatPercent(campaign.ctr)} icon={TrendingUp} />
          </div>

          {dailyMetrics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Performance ao Longo do Tempo</CardTitle>
              </CardHeader>
              <CardContent>
                <PerformanceChart data={dailyMetrics} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB 2: CONJUNTOS DE ANÚNCIOS */}
        <TabsContent value="adsets">
          <Card>
            <CardHeader>
              <CardTitle>Conjuntos de Anúncios</CardTitle>
              <CardDescription>Performance detalhada de cada público/conjunto desta campanha</CardDescription>
            </CardHeader>
            <CardContent>
              {adSets.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum conjunto de anúncio encontrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-3 pr-4">Nome do Conjunto</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 pr-4">Orçamento</th>
                        <th className="pb-3 pr-4">Gasto</th>
                        <th className="pb-3 pr-4">Vendas (Site)</th>
                        <th className="pb-3 pr-4">Leads (Whats)</th>
                        <th className="pb-3 pr-4">CTR</th>
                        <th className="pb-3">CPC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adSets.map(as => (
                        <tr key={as.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-3 pr-4 font-medium">{as.name}</td>
                          <td className="py-3 pr-4">
                            <Badge variant={statusConfig[as.status]?.variant || 'secondary'}>
                              {statusConfig[as.status]?.label || as.status}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4">{as.dailyBudget > 0 ? formatCurrency(as.dailyBudget) : 'CBO'}</td>
                          <td className="py-3 pr-4 font-mono">{formatCurrency(as.spend)}</td>
                          <td className="py-3 pr-4 font-mono font-semibold text-emerald-400">{as.salesCount}</td>
                          <td className="py-3 pr-4 font-mono font-semibold text-blue-400">{as.leadsCount}</td>
                          <td className="py-3 pr-4 font-mono">{formatPercent(as.ctr)}</td>
                          <td className="py-3 font-mono">{formatCurrency(as.cpc)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: ANÚNCIOS & CRIATIVOS */}
        <TabsContent value="ads">
          <Card>
            <CardHeader>
              <CardTitle>Criativos & Anúncios</CardTitle>
              <CardDescription>Métricas individuais de cada criativo rodando no Facebook Ads</CardDescription>
            </CardHeader>
            <CardContent>
              {ads.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum anúncio encontrado.</p>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {ads.map(ad => (
                    <Card key={ad.id} className="overflow-hidden border bg-card/60 flex flex-col">
                      <div className="aspect-video bg-muted relative flex items-center justify-center border-b">
                        {ad.creative?.image_url || ad.creative?.thumbnail_url ? (
                          <img 
                            src={ad.creative.image_url || ad.creative.thumbnail_url} 
                            alt={ad.name} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="text-muted-foreground flex flex-col items-center gap-1">
                            <ImageIcon className="h-8 w-8 opacity-40" />
                            <span className="text-xs">Sem miniatura disponível</span>
                          </div>
                        )}
                        <Badge variant={statusConfig[ad.status]?.variant || 'secondary'} className="absolute top-2 right-2 shadow">
                          {statusConfig[ad.status]?.label || ad.status}
                        </Badge>
                      </div>

                      <CardContent className="p-4 flex-1 space-y-3">
                        <h4 className="font-semibold text-sm line-clamp-1" title={ad.name}>{ad.name}</h4>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t">
                          <div>
                            <span className="text-muted-foreground">Gasto:</span>
                            <p className="font-mono font-medium">{formatCurrency(ad.spend)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Cliques:</span>
                            <p className="font-mono font-medium">{formatNumber(ad.clicks)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Vendas (Site):</span>
                            <p className="font-mono font-bold text-emerald-400">{ad.salesCount}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Leads (Whats):</span>
                            <p className="font-mono font-bold text-blue-400">{ad.leadsCount}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">CTR:</span>
                            <p className="font-mono">{formatPercent(ad.ctr)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">CPC:</span>
                            <p className="font-mono">{formatCurrency(ad.cpc)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}