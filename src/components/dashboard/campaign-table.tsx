'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type Campaign } from '@/lib/mock-data'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import { Pause, Play, Eye, ArrowUpDown } from 'lucide-react'
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog'
import Link from 'next/link'

interface CampaignTableProps {
  campaigns: (Campaign & { resultLabel?: string })[]
  onStatusChange?: (id: string, status: 'ACTIVE' | 'PAUSED') => void
}

const statusConfig = {
  ACTIVE: { label: 'Ativa', variant: 'success' as const },
  PAUSED: { label: 'Pausada', variant: 'warning' as const },
  ARCHIVED: { label: 'Arquivada', variant: 'secondary' as const },
}

const objectiveLabels: Record<string, string> = {
  OUTCOME_TRAFFIC: 'Tráfego (Site)',
  OUTCOME_SALES: 'Vendas (Pixel)',
  OUTCOME_AWARENESS: 'Alcance',
  OUTCOME_LEADS: 'Leads (Formulário)',
  OUTCOME_ENGAGEMENT: 'Engajamento (WhatsApp/Direct)',
}

export function CampaignTable({ campaigns, onStatusChange }: CampaignTableProps) {
  const [confirmAction, setConfirmAction] = useState<{ id: string; name: string; newStatus: 'ACTIVE' | 'PAUSED' } | null>(null)
  const [sortField, setSortField] = useState<keyof Campaign>('spend')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const sorted = [...campaigns].sort((a, b) => {
    const aVal = a[sortField]
    const bVal = b[sortField]
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    }
    return sortDir === 'asc'
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal))
  })

  const toggleSort = (field: keyof Campaign) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Campanhas do Facebook Ads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">Nome</th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">Status</th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">Objetivo</th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort('spend')}>
                    <span className="flex items-center gap-1">Gasto <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort('conversions')}>
                    <span className="flex items-center gap-1">Resultado Principal <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort('clicks')}>
                    <span className="flex items-center gap-1">Cliques no Link <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort('ctr')}>
                    <span className="flex items-center gap-1">CTR <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort('cpc')}>
                    <span className="flex items-center gap-1">CPC <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="pb-3 font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((campaign) => {
                  const label = campaign.resultLabel || (campaign.objective.includes('TRAFFIC') ? 'Cliques no Link' : 'Conversões')
                  const resultValue = campaign.objective.includes('TRAFFIC')
                    ? campaign.clicks
                    : (campaign.conversions > 0 ? campaign.conversions : (campaign.clicks || 0))

                  return (
                    <tr key={campaign.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-3 pr-4">
                        <Link href={`/dashboard/campaigns/${campaign.id}`} className="font-medium hover:text-primary transition-colors">
                          {campaign.name}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={statusConfig[campaign.status]?.variant || 'secondary'}>
                          {statusConfig[campaign.status]?.label || campaign.status}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground text-xs">{objectiveLabels[campaign.objective] || campaign.objective}</td>
                      <td className="py-3 pr-4 font-mono font-medium">{formatCurrency(campaign.spend)}</td>
                      <td className="py-3 pr-4 font-mono">
                        <span className="font-bold text-foreground">{formatNumber(resultValue)}</span>{' '}
                        <span className="text-xs text-muted-foreground">({label})</span>
                      </td>
                      <td className="py-3 pr-4 font-mono">{formatNumber(campaign.clicks)}</td>
                      <td className="py-3 pr-4 font-mono">{formatPercent(campaign.ctr)}</td>
                      <td className="py-3 pr-4 font-mono">{formatCurrency(campaign.cpc)}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/dashboard/campaigns/${campaign.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          {campaign.status !== 'ARCHIVED' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setConfirmAction({
                                  id: campaign.id,
                                  name: campaign.name,
                                  newStatus: campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE',
                                })
                              }
                            >
                              {campaign.status === 'ACTIVE' ? (
                                <Pause className="h-4 w-4 text-amber-400" />
                              ) : (
                                <Play className="h-4 w-4 text-emerald-400" />
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction?.newStatus === 'PAUSED' ? 'Pausar Campanha' : 'Ativar Campanha'}
        description={
          confirmAction?.newStatus === 'PAUSED'
            ? `Tem certeza que deseja pausar a campanha "${confirmAction?.name}"? Os anúncios deixarão de ser veiculados imediatamente.`
            : `Tem certeza que deseja ativar a campanha "${confirmAction?.name}"? Os anúncios começarão a ser veiculados e o orçamento será consumido.`
        }
        variant={confirmAction?.newStatus === 'PAUSED' ? 'warning' : 'default'}
        confirmLabel={confirmAction?.newStatus === 'PAUSED' ? 'Pausar' : 'Ativar'}
        onConfirm={() => {
          if (confirmAction && onStatusChange) {
            onStatusChange(confirmAction.id, confirmAction.newStatus)
          }
          setConfirmAction(null)
        }}
      />
    </>
  )
}
