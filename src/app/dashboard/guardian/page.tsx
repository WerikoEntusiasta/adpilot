'use client'

import { useState, useEffect } from 'react'
import { useSettings } from '@/lib/store'
import {
  useGuardianStore,
  GuardianRule,
  GuardianIncident,
  defaultGuardianRules
} from '@/lib/guardian-store'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  CheckCircle2,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Sliders,
  History,
  Info,
  Sparkles,
  Zap
} from 'lucide-react'

export default function GuardianPage() {
  const settings = useSettings()
  const guardian = useGuardianStore()
  const [mounted, setMounted] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [scanFeedback, setScanFeedback] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleRunScan = async () => {
    const activeRules = guardian.rules.filter(r => r.enabled)
    if (activeRules.length === 0) {
      setScanFeedback('Nenhuma regra está ativada. Ative as chaves desejadas na seção "Configuração das Regras de Segurança" abaixo para o Guardião monitorar seus anúncios.')
      return
    }

    guardian.setIsScanning(true)
    setScanFeedback(null)
    try {
      const res = await fetch('/api/facebook/guardian/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: settings.fbAccessToken,
          adAccountId: settings.fbAdAccountId,
          useAdminToken: settings.useAdminFbToken,
          rules: guardian.rules,
        }),
      })

      const data = await res.json()
      if (res.ok && data.incidents) {
        guardian.setIncidents(data.incidents)
        guardian.setLastScanAt(new Date().toLocaleTimeString('pt-BR'))
        const criticalCount = data.incidents.filter((i: GuardianIncident) => i.severity === 'CRITICAL').length
        if (criticalCount > 0) {
          setScanFeedback(`Varredura concluída: ${criticalCount} incidente(s) crítico(s) de stop-loss detectado(s)!`)
        } else {
          setScanFeedback(`Varredura concluída: Todos os anúncios estão em conformidade com as regras ativadas!`)
        }
      } else {
        setScanFeedback('Erro ao executar varredura.')
      }
    } catch (err) {
      console.error('Erro na varredura do Guardião:', err)
      setScanFeedback('Erro ao conectar ao motor do Guardião.')
    }
    guardian.setIsScanning(false)
  }

  // Executar varredura inicial apenas se houver regras ativas e não houver varredura recente
  useEffect(() => {
    if (mounted && guardian.incidents.length === 0 && guardian.rules.some(r => r.enabled)) {
      handleRunScan()
    }
  }, [mounted])

  const handlePauseAdIncident = async (incident: GuardianIncident) => {
    setActionLoadingId(incident.id)
    try {
      const res = await fetch('/api/facebook/guardian/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: settings.fbAccessToken,
          adAccountId: settings.fbAdAccountId,
          useAdminToken: settings.useAdminFbToken,
          adId: incident.adId,
          status: 'PAUSED',
        }),
      })
      if (res.ok) {
        guardian.resolveIncident(incident.id, 'Anúncio pausado no Meta Ads pelo Guardião')
      }
    } catch (err) {
      console.error('Erro ao pausar anúncio:', err)
    }
    setActionLoadingId(null)
  }

  const handleDismissIncident = (incidentId: string) => {
    guardian.dismissIncident(incidentId)
  }

  const pendingIncidents = guardian.incidents.filter(i => i.status === 'PENDING')
  const criticalCount = pendingIncidents.filter(i => i.severity === 'CRITICAL').length
  const warningCount = pendingIncidents.filter(i => i.severity === 'WARNING').length
  const opportunityCount = pendingIncidents.filter(i => i.severity === 'OPPORTUNITY').length

  // Capital protegido estimado (gasto em anúncios com stop-loss)
  const estimatedSaved = pendingIncidents
    .filter(i => i.category === 'STOP_LOSS')
    .reduce((sum, i) => sum + i.metrics.spend, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-7 w-7 text-primary" />
            Guardião Anti-Prejuízo & Automações
          </h1>
          <p className="text-muted-foreground mt-1">
            Proteja seu orçamento com stop-loss automático, alertas de CPA estourado e detecção de saturação
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleRunScan}
            disabled={guardian.isScanning}
            className="gap-2 shadow-sm font-medium"
          >
            <RefreshCw className={`h-4 w-4 ${guardian.isScanning ? 'animate-spin' : ''}`} />
            {guardian.isScanning ? 'Varrendo Anúncios...' : 'Executar Varredura Agora'}
          </Button>
        </div>
      </div>

      {scanFeedback && (
        <div className={`p-4 rounded-xl border flex items-center gap-2.5 text-sm ${
          criticalCount > 0 
            ? 'bg-red-500/10 border-red-500/20 text-red-400' 
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>
          {criticalCount > 0 ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
          <span>{scanFeedback}</span>
        </div>
      )}

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border bg-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              Status do Guardião
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-2">
              {guardian.rules.some(r => r.enabled) ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <p className="text-lg font-bold text-foreground">
                    Monitorando ({guardian.rules.filter(r => r.enabled).length} ativas)
                  </p>
                </>
              ) : (
                <>
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40"></span>
                  <p className="text-lg font-bold text-muted-foreground">Em Espera (Desligado)</p>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {guardian.rules.some(r => r.enabled)
                ? `Última checagem: ${guardian.lastScanAt || 'Agora'}`
                : 'Ative as regras desejadas abaixo para iniciar'}
            </p>
          </CardContent>
        </Card>

        <Card className="border bg-red-500/5 border-red-500/20">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center justify-between">
              Incidentes Críticos (Stop-Loss)
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{criticalCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Anúncios gastando sem retorno</p>
          </CardContent>
        </Card>

        <Card className="border bg-amber-500/5 border-amber-500/20">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center justify-between">
              Alertas (CPA & Fadiga)
              <TrendingDown className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{warningCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Custos acima da meta</p>
          </CardContent>
        </Card>

        <Card className="border bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
              Capital Sob Risco
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(estimatedSaved)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Verba em anúncios sob análise</p>
          </CardContent>
        </Card>
      </div>

      {/* Seção 1: Violações Detectadas que exigem ação */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">Incidentes & Alertas de Segurança</h2>
            <Badge variant={criticalCount > 0 ? 'destructive' : 'secondary'} className="text-xs">
              {pendingIncidents.length} pendente(s)
            </Badge>
          </div>
        </div>

        {pendingIncidents.length === 0 ? (
          <div className="p-8 text-center rounded-xl border bg-card space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
            <h3 className="font-semibold text-foreground">Nenhum incidente ativo</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Todas as campanhas e anúncios ativos estão respeitando os limites de stop-loss, teto de CPA e níveis de fadiga.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingIncidents.map((incident) => (
              <div
                key={incident.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
                  incident.severity === 'CRITICAL'
                    ? 'bg-red-500/5 border-red-500/30'
                    : incident.severity === 'WARNING'
                    ? 'bg-amber-500/5 border-amber-500/30'
                    : 'bg-emerald-500/5 border-emerald-500/30'
                }`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        incident.severity === 'CRITICAL'
                          ? 'bg-red-500 text-white'
                          : incident.severity === 'WARNING'
                          ? 'bg-amber-500 text-black'
                          : 'bg-emerald-500 text-white'
                      }`}
                    >
                      {incident.severity === 'CRITICAL' ? 'Stop-Loss Disparado' : incident.severity === 'WARNING' ? 'Atenção CPA / Fadiga' : 'Oportunidade'}
                    </span>
                    <h3 className="text-sm font-semibold text-foreground">{incident.adName}</h3>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {incident.reason}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground font-mono pt-1">
                    <span>Gasto: <strong>{formatCurrency(incident.metrics.spend)}</strong></span>
                    <span>Conversões: <strong>{incident.metrics.conversions}</strong></span>
                    {incident.metrics.cpa > 0 && <span>CPA: <strong>{formatCurrency(incident.metrics.cpa)}</strong></span>}
                    {incident.metrics.roas > 0 && <span>ROAS: <strong>{incident.metrics.roas.toFixed(2)}x</strong></span>}
                    {incident.metrics.frequency > 1 && <span>Frequência: <strong>{incident.metrics.frequency.toFixed(2)}x</strong></span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground h-8"
                    onClick={() => handleDismissIncident(incident.id)}
                  >
                    Ignorar
                  </Button>

                  {incident.category === 'STOP_LOSS' || incident.category === 'CPA_CEILING' ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="text-xs h-8 gap-1.5 font-medium"
                      onClick={() => handlePauseAdIncident(incident)}
                      disabled={actionLoadingId === incident.id}
                    >
                      {actionLoadingId === incident.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Pause className="h-3.5 w-3.5" />
                      )}
                      Pausar no Meta Agora
                    </Button>
                  ) : incident.category === 'SCALE' ? (
                    <Button
                      size="sm"
                      className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                      onClick={() => guardian.resolveIncident(incident.id, 'Marcado para escala')}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Aprovar Escala (+15%)
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seção 2: Configuração das Regras do Guardião */}
      <div className="space-y-3 pt-4 border-t">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary" />
              Configuração das Regras de Segurança
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Personalize os limites de tolerância para o stop-loss e alertas de cada regra
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => guardian.resetToDefaults()}
          >
            Restaurar Padrões
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {guardian.rules.map((rule) => (
            <Card key={rule.id} className="border bg-card">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{rule.name}</span>
                  </div>
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={() => guardian.toggleRule(rule.id)}
                  />
                </div>
                <CardDescription className="text-xs mt-1">
                  {rule.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">Limite / Limiar de Disparo:</span>
                  <div className="flex items-center gap-1.5 w-[140px]">
                    {rule.thresholdUnit === 'BRL' && <span className="text-xs text-muted-foreground">R$</span>}
                    <Input
                      type="number"
                      step={rule.thresholdUnit === 'NUMBER' ? '0.1' : '1'}
                      value={rule.threshold}
                      onChange={(e) => guardian.updateRuleThreshold(rule.id, parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs font-mono"
                    />
                    {rule.thresholdUnit === 'PERCENT' && <span className="text-xs text-muted-foreground">%</span>}
                    {rule.thresholdUnit === 'NUMBER' && <span className="text-xs text-muted-foreground">x</span>}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                  <span>Ação Recomendada:</span>
                  <span className="font-semibold text-foreground">
                    {rule.actionType === 'PAUSE' ? '🛑 Pausar Imediatamente' : rule.actionType === 'SCALE_BUDGET' ? '🚀 Sugerir Aumento de Orçamento' : '🔔 Emitir Notificação / Alerta'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
