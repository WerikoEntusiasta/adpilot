'use client'

import { useEffect, useState } from 'react'
import { useSettings } from '@/lib/store'
import { useAuth } from '@/lib/auth-store'
import type { AccountAuditReport, HealthPillar, AuditChecklistItem } from '@/app/api/facebook/audit/route'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Printer,
  TrendingUp,
  Clock,
  Film,
  DollarSign,
  ArrowRight,
  ShieldAlert,
  Brain,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react'

export default function AccountAuditPage() {
  const settings = useSettings()
  const auth = useAuth()
  const [mounted, setMounted] = useState(false)
  const [report, setReport] = useState<AccountAuditReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pillars' | 'checklist'>('pillars')

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchAudit = async (overrideAccountId?: string, forceRefresh = false) => {
    const targetAccountId = overrideAccountId || settings.fbAdAccountId
    setIsLoading(true)
    try {
      const res = await fetch('/api/facebook/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': auth.user?.id || '',
        },
        body: JSON.stringify({
          accessToken: settings.fbAccessToken,
          adAccountId: targetAccountId,
          useAdminToken: settings.useAdminFbToken,
          refresh: forceRefresh,
        }),
      })
      const data = await res.json()
      setReport(data)
    } catch (err) {
      console.error('Erro ao buscar auditoria:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (mounted) {
      fetchAudit()
    }
  }, [mounted, settings.fbAccessToken, settings.fbAdAccountId, settings.useAdminFbToken, auth.user?.id])

  // Atualização instantânea ao trocar conta no Topbar
  useEffect(() => {
    const handleAccountSwitched = (e: Event) => {
      const customEvent = e as CustomEvent<{ adAccountId: string }>
      if (customEvent.detail?.adAccountId) {
        fetchAudit(customEvent.detail.adAccountId)
      }
    }
    window.addEventListener('adpilot:account-switched', handleAccountSwitched)
    return () => window.removeEventListener('adpilot:account-switched', handleAccountSwitched)
  }, [settings.fbAccessToken, settings.useAdminFbToken, auth.user?.id])

  if (!mounted) return null

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-500'
    if (score >= 70) return 'text-blue-500'
    if (score >= 50) return 'text-amber-500'
    return 'text-red-500'
  }

  const getScoreBg = (score: number) => {
    if (score >= 85) return 'from-emerald-500/20 via-emerald-500/5 to-transparent border-emerald-500/30'
    if (score >= 70) return 'from-blue-500/20 via-blue-500/5 to-transparent border-blue-500/30'
    if (score >= 50) return 'from-amber-500/20 via-amber-500/5 to-transparent border-amber-500/30'
    return 'from-red-500/20 via-red-500/5 to-transparent border-red-500/30'
  }

  const getStatusBadge = (status: 'PASS' | 'WARNING' | 'FAIL') => {
    if (status === 'PASS') {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Aprovado
        </Badge>
      )
    }
    if (status === 'WARNING') {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 gap-1">
          <AlertTriangle className="h-3 w-3" />
          Atenção
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 gap-1">
        <XCircle className="h-3 w-3" />
        Crítico
      </Badge>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto print:p-0">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 print:border-none">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1 text-xs">
              <Activity className="h-3.5 w-3.5" />
              Diagnóstico Algorítmico Meta Ads
            </Badge>
            {report?.isRealData ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                Dados Reais da Conta
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">
                Modo Demonstração
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mt-1">
            Meta Health Score & Auditoria
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Análise em tempo real de conformidade algorítmica, desperdícios de leilão e gargalos de aprendizado.
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 text-xs cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            Exportar / Imprimir
          </Button>
          <Button
            size="sm"
            onClick={fetchAudit}
            disabled={isLoading}
            className="gap-1.5 text-xs font-semibold shadow-sm cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Auditando Conta...' : 'Reexecutar Auditoria'}
          </Button>
        </div>
      </div>

      {report && (
        <>
          {/* Card Principal de Score (Hero) */}
          <Card className={`border bg-gradient-to-br ${getScoreBg(report.healthScore)} shadow-xl overflow-hidden`}>
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                {/* Score Circular / Destaque */}
                <div className="flex items-center gap-6">
                  <div className="relative flex items-center justify-center h-28 w-28 sm:h-32 sm:w-32 rounded-full border-4 border-current/20 bg-background/80 shadow-inner shrink-0">
                    <div className="text-center">
                      <span className={`text-4xl sm:text-5xl font-black tracking-tight font-mono ${getScoreColor(report.healthScore)}`}>
                        {report.healthScore}
                      </span>
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">
                        de 100
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge className="text-xs font-bold px-2 py-0.5 shadow-sm">
                        Nota {report.grade}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        Conta: {report.adAccountId}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                      {report.statusText}
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
                      Auditamos {report.activeCampaignsCount} campanhas ativas, {report.activeAdSetsCount} conjuntos e {report.activeAdsCount} anúncios operacionais para medir o aproveitamento real do algoritmo.
                    </p>
                  </div>
                </div>

                {/* Call to action rápido */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-2 w-full lg:w-auto shrink-0 print:hidden">
                  <Button asChild className="gap-1.5 text-xs font-semibold shadow-md shadow-primary/20 cursor-pointer">
                    <Link href="/dashboard/guardian">
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                      Ativar Guardião Stop-Loss
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="gap-1.5 text-xs cursor-pointer">
                    <Link href="/dashboard/advisor">
                      <Brain className="h-3.5 w-3.5 text-primary" />
                      Pedir Análise ao AI Advisor
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4 KPIs de Alto Impacto */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border bg-card shadow-xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-red-500" />
                  Desperdício Estimado / Mês
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-red-500">
                    {formatCurrency(report.estimatedMonthlyWaste)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Gasto em anúncios zumbis e leilões ineficientes
                </p>
              </CardContent>
            </Card>

            <Card className="border bg-card shadow-xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  Aprendizado Limitado
                </span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-bold font-mono ${report.learningLimitedCount > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {report.learningLimitedCount}
                  </span>
                  <span className="text-xs text-muted-foreground">de {report.activeAdSetsCount} conjuntos</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {report.learningLimitedCount > 0 ? 'Conjuntos sem volume mínimo de 50 conv/sem' : 'Todos os conjuntos com entrega estável'}
                </p>
              </CardContent>
            </Card>

            <Card className="border bg-card shadow-xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Film className="h-3.5 w-3.5 text-purple-500" />
                  Diversidade Criativa (Vídeos)
                </span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-bold font-mono ${report.creativeDiversityRatio >= 35 ? 'text-emerald-500' : 'text-blue-500'}`}>
                    {report.creativeDiversityRatio}%
                  </span>
                  <span className="text-xs text-muted-foreground">em vídeo</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {report.creativeDiversityRatio >= 35 ? 'Excelente cobertura Reels e Stories' : 'Recomendado expandir formatos verticais'}
                </p>
              </CardContent>
            </Card>

            <Card className="border bg-card shadow-xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  Criativos em Veiculação
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-primary">
                    {report.activeAdsCount}
                  </span>
                  <span className="text-xs text-muted-foreground">anúncios ativos</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Investimento total: {formatCurrency(report.totalSpendAnalyzed)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Abas: 5 Pilares vs Checklist de Otimização */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <TabsList className="bg-muted/60 p-1">
                <TabsTrigger value="pillars" className="text-xs gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  5 Pilares de Auditoria Algorítmica
                </TabsTrigger>
                <TabsTrigger value="checklist" className="text-xs gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Checklist Anti-Desperdício ({report.checklist.length})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Conteúdo Aba 1: 5 Pilares */}
            <TabsContent value="pillars" className="space-y-4">
              <div className="grid gap-4">
                {report.pillars.map((pillar) => (
                  <Card key={pillar.id} className="border bg-card hover:shadow-md transition-shadow">
                    <CardHeader className="p-5 pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-mono font-bold text-base shrink-0 ${
                            pillar.score >= 80 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                            pillar.score >= 60 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                            'bg-red-500/10 text-red-500 border border-red-500/20'
                          }`}>
                            {pillar.score}
                          </div>
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              {pillar.title}
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground mt-0.5">
                              {pillar.summary}
                            </CardDescription>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center">
                          {getStatusBadge(pillar.status)}
                          <span className="text-[11px] text-muted-foreground font-mono">
                            Peso: {Math.round(pillar.weight * 100)}%
                          </span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 pt-0 space-y-3">
                      {/* Barra de Progresso do Pilar */}
                      <div className="space-y-1">
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              pillar.score >= 80 ? 'bg-emerald-500' :
                              pillar.score >= 60 ? 'bg-amber-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${pillar.score}%` }}
                          />
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {pillar.description}
                      </p>

                      {/* Métricas do Pilar */}
                      {pillar.metrics && Object.keys(pillar.metrics).length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {Object.entries(pillar.metrics).map(([key, val]) => (
                            <div key={key} className="px-2.5 py-1 rounded bg-muted/40 border text-xs">
                              <span className="text-muted-foreground">{key}: </span>
                              <strong className="text-foreground">{val}</strong>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Recomendação Prática */}
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 flex items-start gap-2.5 text-xs">
                        <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-foreground block mb-0.5">Recomendação Estratégica:</strong>
                          <span className="text-muted-foreground leading-relaxed">{pillar.recommendation}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Conteúdo Aba 2: Checklist */}
            <TabsContent value="checklist" className="space-y-4">
              <Card className="border bg-card">
                <CardHeader className="p-5 pb-3">
                  <CardTitle className="text-base">Checklist de Otimização e Prevenção de Desperdício</CardTitle>
                  <CardDescription className="text-xs">
                    Execute estas ações prioritárias para elevar a nota de saúde da sua conta para 90+.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 pt-0 divide-y">
                  {report.checklist.map((item) => (
                    <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {item.status === 'PASS' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : item.status === 'WARNING' ? (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{item.title}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-muted">
                              {item.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{item.actionText}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <Badge className={`text-[10px] font-bold ${
                          item.priority === 'ALTA' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          item.priority === 'MÉDIA' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          Prioridade {item.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
