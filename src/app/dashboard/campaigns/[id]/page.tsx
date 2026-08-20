'use client'

import { use } from 'react'
import { mockCampaigns, mockDailyMetrics } from '@/lib/mock-data'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { PerformanceChart } from '@/components/dashboard/performance-chart'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import { ArrowLeft, DollarSign, Eye, MousePointer, Target, TrendingUp, Calendar, Pause, Play } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog'

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' }> = {
  ACTIVE: { label: 'Ativa', variant: 'success' },
  PAUSED: { label: 'Pausada', variant: 'warning' },
  ARCHIVED: { label: 'Arquivada', variant: 'secondary' },
}

const objectiveLabels: Record<string, string> = {
  OUTCOME_TRAFFIC: 'Tráfego',
  OUTCOME_SALES: 'Vendas',
  OUTCOME_AWARENESS: 'Alcance',
  OUTCOME_LEADS: 'Leads',
  OUTCOME_ENGAGEMENT: 'Engajamento',
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const campaign = mockCampaigns.find(c => c.id === id)
  const [showConfirm, setShowConfirm] = useState(false)
  const [status, setStatus] = useState(campaign?.status)

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <p className="text-xl text-muted-foreground">Campanha não encontrada</p>
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
            <Badge variant={statusConfig[status || campaign.status].variant}>
              {statusConfig[status || campaign.status].label}
            </Badge>
          </div>
          <div className="flex items-center gap-4 ml-12 text-sm text-muted-foreground">
            <span>{objectiveLabels[campaign.objective]}</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Início: {campaign.startDate}
            </span>
            {campaign.endDate && <span>Fim: {campaign.endDate}</span>}
          </div>
        </div>
        {status !== 'ARCHIVED' && (
          <Button
            variant={status === 'ACTIVE' ? 'outline' : 'default'}
            onClick={() => setShowConfirm(true)}
          >
            {status === 'ACTIVE' ? (
              <><Pause className="h-4 w-4 mr-2" /> Pausar</>            
            ) : (
              <><Play className="h-4 w-4 mr-2" /> Ativar</>            
            )}
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KpiCard title="Gasto Total" value={formatCurrency(campaign.spend)} icon={DollarSign} />
        <KpiCard title="Impressões" value={formatNumber(campaign.impressions)} icon={Eye} />
        <KpiCard title="Cliques" value={formatNumber(campaign.clicks)} icon={MousePointer} />
        <KpiCard title="CTR" value={formatPercent(campaign.ctr)} icon={TrendingUp} />
        <KpiCard title="Conversões" value={formatNumber(campaign.conversions)} icon={Target} />
      </div>

      {/* Details Card */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Detalhes da Campanha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-muted-foreground">Orçamento diário</span><span className="font-medium">{formatCurrency(campaign.dailyBudget)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">CPC Médio</span><span className="font-medium">{formatCurrency(campaign.cpc)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">CPA</span><span className="font-medium">{campaign.cpa > 0 ? formatCurrency(campaign.cpa) : '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">ROAS</span><span className="font-medium">{campaign.roas > 0 ? `${campaign.roas}x` : '—'}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Insights da IA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {campaign.roas > 4 && (
                <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
                  ✨ Excelente ROAS de {campaign.roas}x! Considere aumentar o orçamento para escalar resultados.
                </div>
              )}
              {campaign.ctr < 2 && (
                <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400">
                  ⚠️ CTR abaixo da média. Teste novos criativos ou refine o público-alvo.
                </div>
              )}
              {campaign.status === 'PAUSED' && (
                <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
                  💡 Campanha pausada. Avalie se vale reativar com ajustes baseados nos dados históricos.
                </div>
              )}
              {campaign.ctr >= 2 && campaign.roas <= 4 && campaign.roas > 0 && (
                <div className="p-3 rounded-lg bg-primary/10 text-primary">
                  📊 Performance sólida. Otimize o CPA reduzindo públicos com menor conversão.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <PerformanceChart data={mockDailyMetrics} />

      {/* Confirm Dialog */}
      <ConfirmationDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title={status === 'ACTIVE' ? 'Pausar Campanha' : 'Ativar Campanha'}
        description={status === 'ACTIVE'
          ? `Ao pausar "${campaign.name}", os anúncios deixarão de ser veiculados imediatamente.`
          : `Ao ativar "${campaign.name}", os anúncios começarão a ser veiculados e o orçamento diário de ${formatCurrency(campaign.dailyBudget)} será consumido.`
        }
        variant={status === 'ACTIVE' ? 'warning' : 'default'}
        confirmLabel={status === 'ACTIVE' ? 'Pausar Campanha' : 'Ativar Campanha'}
        onConfirm={() => setStatus(s => s === 'ACTIVE' ? 'PAUSED' : 'ACTIVE')}
      />
    </div>
  )
}
