'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { formatCurrency, formatNumber } from '@/lib/utils'
import type { Campaign } from '@/lib/mock-data'
import {
  FileText,
  Copy,
  Check,
  Printer,
  Share2,
  ExternalLink,
  DollarSign,
  TrendingUp,
  Target,
  MessageSquare,
  Sparkles,
  Award
} from 'lucide-react'

interface ExportReportModalProps {
  campaigns: Campaign[]
  datePreset: string
  totalSpend: number
  totalPurchaseValue: number
  effectiveRoas: number
  totalPurchases: number
  totalMessages: number
  totalLeads: number
  totalClicks: number
}

export function ExportReportModal({
  campaigns,
  datePreset,
  totalSpend,
  totalPurchaseValue,
  effectiveRoas,
  totalPurchases,
  totalMessages,
  totalLeads,
  totalClicks,
}: ExportReportModalProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'pdf'>('whatsapp')

  // Mapeamento amigável do período
  const periodMap: Record<string, string> = {
    maximum: 'Todo o Período Histórico',
    last_30d: 'Últimos 30 Dias',
    last_14d: 'Últimos 14 Dias',
    last_7d: 'Últimos 7 Dias',
    this_month: 'Mês Atual',
    last_month: 'Mês Anterior',
    today: 'Hoje',
    yesterday: 'Ontem',
  }
  const periodLabel = periodMap[datePreset] || 'Período Selecionado'

  // Top campanhas operacionais por performance (estritamente não-arquivadas!)
  const topCampaigns = [...campaigns]
    .filter(c => c.status !== 'ARCHIVED' && (c.spend || 0) > 0)
    .sort((a, b) => (b.roas || 0) - (a.roas || 0) || (b.conversions || 0) - (a.conversions || 0))
    .slice(0, 3)

  // Gerar texto formatado com emojis para WhatsApp
  const generateWhatsAppText = () => {
    let text = `📊 *RELATÓRIO DE PERFORMANCE — ADPiLOT*\n`
    text += `🗓️ *Período:* ${periodLabel}\n`
    text += `⏰ *Data de Emissão:* ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n\n`

    text += `━━━━━━━━━━━━━━━━━━━━\n`
    text += `💰 *RESUMO FINANCEIRO*\n`
    text += `• *Investimento Total:* ${formatCurrency(totalSpend)}\n`

    if (totalPurchaseValue > 0) {
      text += `• *Faturamento / Retorno:* ${formatCurrency(totalPurchaseValue)}\n`
      text += `• *ROAS da Conta:* ${effectiveRoas.toFixed(2)}x\n`
      const net = totalPurchaseValue - totalSpend
      text += `• *Lucro Bruto dos Anúncios:* ${formatCurrency(net)}\n`
    }

    text += `\n🎯 *RESULTADOS & CONVERSÕES*\n`
    if (totalPurchases > 0) {
      text += `• *Vendas Realizadas:* ${formatNumber(totalPurchases)}\n`
      const cpa = totalSpend / totalPurchases
      text += `• *Custo Médio p/ Venda (CPA):* ${formatCurrency(cpa)}\n`
    }
    if (totalMessages > 0) {
      text += `• *Conversas WhatsApp:* ${formatNumber(totalMessages)}\n`
      const costPerMsg = totalSpend / totalMessages
      text += `• *Custo p/ Conversa:* ${formatCurrency(costPerMsg)}\n`
    }
    if (totalLeads > 0 && totalMessages === 0) {
      text += `• *Leads Gerados:* ${formatNumber(totalLeads)}\n`
      const cpl = totalSpend / totalLeads
      text += `• *Custo p/ Lead:* ${formatCurrency(cpl)}\n`
    }
    text += `• *Total de Cliques:* ${formatNumber(totalClicks)}\n\n`

    if (topCampaigns.length > 0) {
      text += `🏆 *CAMPANHAS EM DESTAQUE*\n`
      topCampaigns.forEach((c, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'
        const extra = c.roas > 0 ? `ROAS ${c.roas.toFixed(2)}x` : `${c.conversions} conv.`
        text += `${medal} *${c.name}*\n`
        text += `   Gasto: ${formatCurrency(c.spend)} | ${extra}\n`
      })
      text += `\n`
    }

    text += `━━━━━━━━━━━━━━━━━━━━\n`
    text += `🛡️ *Relatório validado com as regras do Guardião AdPilot.*`

    return text
  }

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppText()
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleOpenWhatsApp = () => {
    const text = generateWhatsAppText()
    const encoded = encodeURIComponent(text)
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank')
  }

  const handlePrintPdf = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2 shadow-sm font-medium border-primary/20 hover:border-primary/50">
          <Share2 className="h-4 w-4 text-primary" />
          <span>Exportar Relatório</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Exportar Relatório Executivo
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Compartilhe os resultados de forma profissional no WhatsApp de clientes ou gere um PDF executivo para impressão.
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full mt-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="whatsapp" className="gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-500" />
              <span>Resumo para WhatsApp</span>
            </TabsTrigger>
            <TabsTrigger value="pdf" className="gap-2">
              <Printer className="h-4 w-4 text-primary" />
              <span>PDF Executivo / Imprimir</span>
            </TabsTrigger>
          </TabsList>

          {/* ABA WHATSAPP */}
          <TabsContent value="whatsapp" className="space-y-4 pt-3">
            <div className="bg-muted/50 rounded-xl p-4 border font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[360px] overflow-y-auto select-all">
              {generateWhatsAppText()}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Formatado automaticamente com emojis e quebras de linha ideais
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyWhatsApp} className="gap-2">
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-500" />
                      <span className="text-emerald-500 font-semibold">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copiar Texto
                    </>
                  )}
                </Button>
                <Button size="sm" onClick={handleOpenWhatsApp} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <ExternalLink className="h-4 w-4" />
                  Abrir no WhatsApp
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ABA PDF EXECUTIVO */}
          <TabsContent value="pdf" className="space-y-4 pt-3">
            <div id="adpilot-printable-report" className="border rounded-xl p-6 bg-card space-y-6">
              {/* Header do Relatório */}
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                      AP
                    </div>
                    <span className="text-xl font-bold tracking-tight">AdPilot</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Relatório Executivo de Tráfego Pago & Performance</p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-semibold text-foreground">{periodLabel}</p>
                  <p className="text-muted-foreground">Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              {/* Grid de KPIs principais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border bg-muted/20">
                  <span className="text-xs text-muted-foreground">Investimento Total</span>
                  <p className="text-lg font-bold text-foreground mt-1">{formatCurrency(totalSpend)}</p>
                </div>

                <div className="p-3 rounded-lg border bg-muted/20">
                  <span className="text-xs text-muted-foreground">
                    {totalPurchaseValue > 0 ? 'Faturamento Pixel' : totalMessages > 0 ? 'Conversas' : 'Conversões'}
                  </span>
                  <p className="text-lg font-bold text-foreground mt-1">
                    {totalPurchaseValue > 0 
                      ? formatCurrency(totalPurchaseValue) 
                      : totalMessages > 0 
                      ? `${formatNumber(totalMessages)} msgs` 
                      : `${formatNumber(totalPurchases || totalLeads)}`}
                  </p>
                </div>

                <div className="p-3 rounded-lg border bg-muted/20">
                  <span className="text-xs text-muted-foreground">ROAS da Conta</span>
                  <p className="text-lg font-bold text-emerald-500 mt-1">
                    {effectiveRoas > 0 ? `${effectiveRoas.toFixed(2)}x` : '—'}
                  </p>
                </div>

                <div className="p-3 rounded-lg border bg-muted/20">
                  <span className="text-xs text-muted-foreground">Cliques Totais</span>
                  <p className="text-lg font-bold text-foreground mt-1">{formatNumber(totalClicks)}</p>
                </div>
              </div>

              {/* Destaque das Campanhas */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-primary" />
                  Campanhas em Destaque no Período
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/60 text-muted-foreground">
                      <tr>
                        <th className="py-2 px-3 text-left font-medium">Campanha</th>
                        <th className="py-2 px-3 text-right font-medium">Investido</th>
                        <th className="py-2 px-3 text-right font-medium">Conversões</th>
                        <th className="py-2 px-3 text-right font-medium">ROAS / CPA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {topCampaigns.map((c) => (
                        <tr key={c.id}>
                          <td className="py-2.5 px-3 font-medium text-foreground">{c.name}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(c.spend)}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{c.conversions || 0}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600">
                            {c.roas > 0 ? `${c.roas.toFixed(2)}x` : c.cpa > 0 ? formatCurrency(c.cpa) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Rodapé institucional */}
              <div className="border-t pt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Gerado automaticamente pela Inteligência Artificial do AdPilot</span>
                <span>Confidencial • Uso Estratégico</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" onClick={handlePrintPdf} className="gap-2">
                <Printer className="h-4 w-4" />
                Imprimir / Salvar como PDF
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
