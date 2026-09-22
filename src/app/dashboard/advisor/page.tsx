'use client'

import { useAuth } from '@/lib/auth-store'
import { useEffect, useState, useMemo } from 'react'
import type { AiSuggestion, Campaign } from '@/lib/mock-data'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog'
import {
  Brain,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  Send,
  CheckCircle2,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  ShieldAlert,
  Target,
  Zap,
  DollarSign,
  ArrowRight,
  TrendingDown,
  Layers
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettings } from '@/lib/store'
import { unpackAndSanitizeSuggestions } from '@/lib/ai-helpers'

// Configuração visual para cada tipo de sugestão da IA (Ícones, Cores e Badges)
const typeConfig = {
  critical: {
    label: 'Ação Crítica • Prejuízo Detectado',
    shortLabel: 'Crítica',
    icon: ShieldAlert,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/40 hover:border-red-500/80',
    badgeVariant: 'destructive' as const,
    badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30 font-semibold',
  },
  warning: {
    label: 'Alerta de Eficiência • Gargalo',
    shortLabel: 'Alerta',
    icon: AlertTriangle,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/40 hover:border-amber-500/80',
    badgeVariant: 'warning' as const,
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30 font-semibold',
  },
  opportunity: {
    label: 'Oportunidade de Escala',
    shortLabel: 'Escala',
    icon: Lightbulb,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/40 hover:border-emerald-500/80',
    badgeVariant: 'success' as const,
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-semibold',
  },
  improvement: {
    label: 'Otimização Técnica',
    shortLabel: 'Melhoria',
    icon: TrendingUp,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/40 hover:border-blue-500/80',
    badgeVariant: 'default' as const,
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30 font-semibold',
  },
  new_campaign: {
    label: 'Nova Estrutura Recomendada',
    shortLabel: 'Estrutura',
    icon: Sparkles,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/40 hover:border-purple-500/80',
    badgeVariant: 'secondary' as const,
    badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30 font-semibold',
  },
}

// Configuração visual para o nível de impacto da sugestão
const impactConfig = {
  high: { label: 'Alto Impacto', variant: 'destructive' as const },
  medium: { label: 'Médio Impacto', variant: 'warning' as const },
  low: { label: 'Baixo Impacto', variant: 'secondary' as const },
}

export default function AdvisorPage() {
  const settings = useSettings()
  const auth = useAuth()
  const [dailyInfo, setDailyInfo] = useState<{ date: string; createdAt: string } | null>(null)
  const [isLoadingDaily, setIsLoadingDaily] = useState(true)
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false)
  
  // Estado para hidratação
  const [mounted, setMounted] = useState(false)
  
  // Array de sugestões da IA (sanitizado e garantido de não conter JSON bruto)
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([])
  
  // Campanhas reais trazidas do Facebook
  const [realCampaigns, setRealCampaigns] = useState<Campaign[]>([])
  
  // Modal de confirmação ao aplicar sugestão
  const [selectedSuggestion, setSelectedSuggestion] = useState<AiSuggestion | null>(null)
  
  // Histórico de quais IDs já foram aplicados
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())
  
  // Estado de carregamento da análise principal
  const [isAnalyzingReal, setIsAnalyzingReal] = useState(false)

  // Filtro de abas
  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'warning' | 'opportunity'>('all')

  // Mensagens do chat lateral de suporte com o Agente de Tráfego Pago
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'assistant', content: 'Olá! Sou o AdPilot AI Advisor, seu Especialista Sênior em Tráfego Pago. Estou analisando seus dados reais. Como posso te ajudar a escalar hoje?' },
  ])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Carrega sugestões diárias salvas no banco e desempacota automaticamente
  useEffect(() => {
    if (mounted && auth.user?.id) {
      setIsLoadingDaily(true)
      fetch('/api/advisor/daily', {
        headers: { 'X-User-Id': auth.user.id }
      })
      .then(r => r.json())
      .then(data => {
        if (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          const clean = unpackAndSanitizeSuggestions(data.suggestions)
          setSuggestions(clean)
          setDailyInfo({ date: data.date, createdAt: data.createdAt })
        }
      })
      .catch(console.error)
      .finally(() => setIsLoadingDaily(false))
    } else if (mounted) {
      setIsLoadingDaily(false)
    }
  }, [mounted, auth.user?.id])

  // Busca e sincroniza as campanhas reais do Facebook
  const loadCampaigns = async (overrideAccountId?: string): Promise<Campaign[]> => {
    const targetAccountId = overrideAccountId || settings.fbAdAccountId
    if (!targetAccountId) return []
    setIsLoadingCampaigns(true)
    try {
      const res = await fetch('/api/facebook/campaigns', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': auth.user?.id || ''
        },
        body: JSON.stringify({
          accessToken: settings.fbAccessToken,
          adAccountId: targetAccountId,
          useAdminToken: settings.useAdminFbToken
        })
      })
      const data = await res.json()
      if (data.campaigns && Array.isArray(data.campaigns)) {
        const operational = data.campaigns.filter((c: any) => c.status !== 'ARCHIVED')
        setRealCampaigns(operational)
        return operational
      }
    } catch (e) {
      console.error('Erro ao buscar campanhas do Facebook:', e)
    } finally {
      setIsLoadingCampaigns(false)
    }
    return []
  }

  // Carrega as campanhas reais do Facebook automaticamente se montado
  useEffect(() => {
    if (mounted && (settings.useAdminFbToken || settings.fbAccessToken) && settings.fbAdAccountId) {
      loadCampaigns()
    }
  }, [mounted, settings.fbAccessToken, settings.fbAdAccountId, settings.useAdminFbToken])

  // Atualização instantânea ao trocar conta no Topbar
  useEffect(() => {
    const handleAccountSwitched = (e: Event) => {
      const customEvent = e as CustomEvent<{ adAccountId: string }>
      if (customEvent.detail?.adAccountId) {
        loadCampaigns(customEvent.detail.adAccountId)
      }
    }
    window.addEventListener('adpilot:account-switched', handleAccountSwitched)
    return () => window.removeEventListener('adpilot:account-switched', handleAccountSwitched)
  }, [settings.fbAccessToken, settings.useAdminFbToken])

  // Função disparada ao clicar em "Analisar Minhas Campanhas Agora"
  const handleAnalyzeReal = async () => {
    setIsAnalyzingReal(true)
    try {
      let campaignsToAnalyze = realCampaigns

      // Se ainda não tiver carregado campanhas, busca sob demanda
      if (campaignsToAnalyze.length === 0) {
        campaignsToAnalyze = await loadCampaigns()
      }

      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': auth.user?.id || ''
        },
        body: JSON.stringify({
          campaigns: campaignsToAnalyze,
          endpoint: settings.aiEndpoint,
          apiKey: settings.aiApiKey,
          model: settings.aiModel,
        }),
      })

      const data = await res.json()
      if (res.ok && data.suggestions) {
        const clean = unpackAndSanitizeSuggestions(data.suggestions)
        setSuggestions(clean)
        if (auth.user?.id) {
          fetch('/api/advisor/daily', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-User-Id': auth.user.id },
            body: JSON.stringify({ suggestions: clean })
          }).catch(console.error)
        }
      } else {
        alert('Erro ao analisar: ' + (data.error || 'Desconhecido'))
      }
    } catch (e) {
      console.error('Erro de conexão ao analisar:', e)
      alert('Erro de conexão ao analisar com a IA.')
    } finally {
      setIsAnalyzingReal(false)
    }
  }

  // Envia uma mensagem para o chat de suporte da IA
  const handleChat = async () => {
    if (!chatInput.trim() || isChatLoading) return
    const newMessages = [...chatMessages, { role: 'user' as const, content: chatInput }]
    setChatMessages(newMessages)
    setChatInput('')
    setIsChatLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          campaigns: realCampaigns,
          endpoint: settings.aiEndpoint,
          apiKey: settings.aiApiKey,
          model: settings.aiModel,
        }),
      })
      const data = await res.json()
      if (res.ok && data.reply) {
        setChatMessages([...newMessages, { role: 'assistant', content: data.reply }])
      } else {
        setChatMessages([...newMessages, { role: 'assistant', content: '❌ Desculpe, não consegui processar a resposta: ' + data.error }])
      }
    } catch (error) {
      setChatMessages([...newMessages, { role: 'assistant', content: '❌ Erro de conexão com a IA.' }])
    } finally {
      setIsChatLoading(false)
    }
  }

  // Marca uma sugestão como aplicada
  const handleApply = (id: string) => {
    setAppliedIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
    setSelectedSuggestion(null)
  }

  // Contadores e listas filtradas
  const criticalCount = useMemo(() => {
    return suggestions.filter(s => s.type === 'critical' || (s.impact === 'high' && s.type === 'warning')).length
  }, [suggestions])

  const warningCount = useMemo(() => {
    return suggestions.filter(s => s.type === 'warning' && s.impact !== 'high').length
  }, [suggestions])

  const opportunityCount = useMemo(() => {
    return suggestions.filter(s => s.type === 'opportunity' || s.type === 'improvement' || s.type === 'new_campaign').length
  }, [suggestions])

  const filteredSuggestions = useMemo(() => {
    if (activeTab === 'critical') {
      return suggestions.filter(s => s.type === 'critical' || (s.impact === 'high' && s.type === 'warning'))
    }
    if (activeTab === 'warning') {
      return suggestions.filter(s => s.type === 'warning' && s.impact !== 'high')
    }
    if (activeTab === 'opportunity') {
      return suggestions.filter(s => s.type === 'opportunity' || s.type === 'improvement' || s.type === 'new_campaign')
    }
    return suggestions
  }, [suggestions, activeTab])

  if (!mounted) return null

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" />
            IA Advisor
          </h1>
          <p className="text-muted-foreground mt-1">
            Auditoria diagnóstica contínua e recomendações de alto impacto baseadas no algoritmo oficial da Meta.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Painel Central: Sugestões e Ações */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card de Análise Dinâmica */}
          <Card className="bg-gradient-to-br from-primary/10 via-card to-card border-primary/20 shadow-sm">
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <h3 className="font-bold text-lg text-foreground">Diagnóstico em Tempo Real</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    {isLoadingCampaigns 
                      ? 'Sincronizando campanhas ativas do Meta Ads...'
                      : realCampaigns.length > 0 
                        ? `Conectado a ${realCampaigns.length} campanha${realCampaigns.length > 1 ? 's' : ''} operacional${realCampaigns.length > 1 ? 'is' : ''}. Campanhas arquivadas desconsideradas.` 
                        : 'Nenhuma campanha carregada ou Meta Ads não sincronizado.'}
                  </p>
                </div>
                <Button 
                  onClick={handleAnalyzeReal} 
                  disabled={isAnalyzingReal} 
                  className="shadow-md shadow-primary/20 shrink-0 cursor-pointer font-medium"
                >
                  {isAnalyzingReal ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analisando com IA...</>
                  ) : (
                    <><RefreshCw className="mr-2 h-4 w-4" /> Analisar Minhas Campanhas Agora</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 4 Cards de Resumo Executivo (KPIs do Advisor) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border bg-card/60 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Diagnósticos</span>
              <p className="text-2xl font-bold tracking-tight text-foreground">{suggestions.length}</p>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Layers className="h-3 w-3 text-primary" /> Total mapeado
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 space-y-1">
              <span className="text-[11px] font-semibold text-red-400 uppercase tracking-wider block">Ações Críticas</span>
              <p className="text-2xl font-bold tracking-tight text-red-500">{criticalCount}</p>
              <span className="text-[10px] text-red-400/90 flex items-center gap-1">
                <ShieldAlert className="h-3 w-3 text-red-500" /> Prejuízo imediato
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-1">
              <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">Gargalos</span>
              <p className="text-2xl font-bold tracking-tight text-amber-500">{warningCount}</p>
              <span className="text-[10px] text-amber-400/90 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-500" /> CTR / Audiência
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">Oportunidades</span>
              <p className="text-2xl font-bold tracking-tight text-emerald-500">{opportunityCount}</p>
              <span className="text-[10px] text-emerald-400/90 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" /> Potencial de Escala
              </span>
            </div>
          </div>

          {/* Banner de Relatório Diário */}
          <div className="p-3.5 rounded-xl border bg-muted/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-xs sm:text-sm">
                  {dailyInfo 
                    ? `Recomendações do Dia (${dailyInfo.date})`
                    : 'Relatório Diário Programado (12:00)'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  O motor de inteligência gera planos de ação diariamente avaliando os leilões das últimas 24h.
                </p>
              </div>
            </div>
            {dailyInfo && (
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shrink-0">
                ● Atualizado às 12:00
              </Badge>
            )}
          </div>

          {/* Abas e Filtros de Recomendações */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex flex-wrap gap-1.5">
                <Button
                  variant={activeTab === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('all')}
                  className="h-8 text-xs font-semibold gap-1.5"
                >
                  Todas
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-4">
                    {suggestions.length}
                  </Badge>
                </Button>

                <Button
                  variant={activeTab === 'critical' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('critical')}
                  className={`h-8 text-xs font-semibold gap-1.5 ${
                    activeTab === 'critical' ? 'bg-red-600 hover:bg-red-700 text-white' : 'text-red-400 hover:text-red-300'
                  }`}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Críticas
                  {criticalCount > 0 && (
                    <Badge variant="destructive" className="px-1.5 py-0 text-[10px] h-4">
                      {criticalCount}
                    </Badge>
                  )}
                </Button>

                <Button
                  variant={activeTab === 'warning' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('warning')}
                  className={`h-8 text-xs font-semibold gap-1.5 ${
                    activeTab === 'warning' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'text-amber-400 hover:text-amber-300'
                  }`}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Alertas
                  {warningCount > 0 && (
                    <Badge variant="warning" className="px-1.5 py-0 text-[10px] h-4">
                      {warningCount}
                    </Badge>
                  )}
                </Button>

                <Button
                  variant={activeTab === 'opportunity' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('opportunity')}
                  className={`h-8 text-xs font-semibold gap-1.5 ${
                    activeTab === 'opportunity' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  Oportunidades
                  {opportunityCount > 0 && (
                    <Badge variant="success" className="px-1.5 py-0 text-[10px] h-4">
                      {opportunityCount}
                    </Badge>
                  )}
                </Button>
              </div>

              <span className="text-xs text-muted-foreground hidden sm:inline">
                Mostrando {filteredSuggestions.length} de {suggestions.length}
              </span>
            </div>

            {/* Lista Renderizada */}
            {filteredSuggestions.length === 0 && !isAnalyzingReal && (
              <div className="py-16 text-center text-muted-foreground border border-dashed rounded-xl bg-card/30">
                <Brain className="h-12 w-12 mx-auto mb-3 opacity-25" />
                <p className="font-semibold text-foreground text-sm">Nenhuma recomendação nesta categoria.</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Clique em &quot;Analisar Minhas Campanhas Agora&quot; acima para gerar um diagnóstico completo e atualizado.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {filteredSuggestions.map((suggestion, index) => (
                <SuggestionCard
                  key={suggestion.id || `sug-${index}`}
                  suggestion={suggestion}
                  isApplied={appliedIds.has(suggestion.id)}
                  onApply={() => setSelectedSuggestion(suggestion)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar: Assistente Pessoal (Chat) */}
        <div className="lg:col-span-1">
          <Card className="flex flex-col h-[calc(100vh-12rem)] sticky top-6 shadow-sm border-border">
            <CardHeader className="border-b bg-muted/30 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Assistente AdPilot
                </CardTitle>
                <Badge variant="outline" className="text-[10px] text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                  Online 24/7
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Pergunte sobre orçamento, estratégias de escala e criativos da sua conta.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {chatMessages.map((msg, i) => (
                <div key={i} className={cn('flex flex-col', msg.role === 'user' ? 'items-end' : 'items-start')}>
                  <div
                    className={cn(
                      'px-3.5 py-2.5 rounded-2xl max-w-[88%] text-xs leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-xs shadow-xs'
                        : 'bg-muted/80 text-foreground border rounded-tl-xs'
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex items-start">
                  <div className="bg-muted px-3.5 py-2.5 rounded-2xl rounded-tl-xs max-w-[85%] text-xs flex items-center gap-2 text-muted-foreground border">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" /> O especialista está analisando...
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="p-3 border-t bg-muted/10">
              <form
                onSubmit={(e) => { e.preventDefault(); handleChat() }}
                className="flex w-full gap-2 items-center"
              >
                <Textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ex: Devo pausar ou reestruturar a campanha de Remarketing?"
                  className="min-h-[42px] h-[42px] resize-none pr-3 text-xs rounded-xl"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleChat()
                    }
                  }}
                />
                <Button type="submit" size="icon" className="shrink-0 rounded-xl h-10 w-10 cursor-pointer" disabled={isChatLoading || !chatInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Dialog de Confirmação de Ação */}
      {selectedSuggestion && (
        <ConfirmationDialog
          open={!!selectedSuggestion}
          onOpenChange={(o) => !o && setSelectedSuggestion(null)}
          title="Executar Recomendação Estratégica"
          description={selectedSuggestion ? `Confirma a implementação da diretriz: "${selectedSuggestion.title}"? Ela será sinalizada como aplicada no seu histórico.` : ''}
          confirmLabel="Sim, Confirmar Execução"
          cancelLabel="Cancelar"
          onConfirm={() => selectedSuggestion && handleApply(selectedSuggestion.id)}
        />
      )}
    </div>
  )
}

/**
 * Renderizador de texto formatado para o diagnóstico
 * Evita blocos gigantescos de texto e organiza listas numeradas de forma didática
 */
function FormattedDescription({ text }: { text: string }) {
  if (!text) return null

  // Se o texto tiver marcadores numerados do tipo (1), (2), (3) ou 1., 2.
  const hasNumberedList = /\([1-9]\)|\b[1-9]\.\s/.test(text)

  if (hasNumberedList) {
    const parts = text.split(/(?=\([1-9]\)|\b[1-9]\.\s)/g)
    return (
      <div className="space-y-2 mt-1">
        {parts.map((p, idx) => {
          const trimmed = p.trim()
          if (!trimmed) return null
          return (
            <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-2"></span>
              <span>{trimmed}</span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line mt-1">
      {text}
    </p>
  )
}

/**
 * Card Executivo de Sugestão Individual
 * Exibe de forma limpa: Severidade, Título, Diagnóstico, Impacto Financeiro e Plano de Ação
 */
function SuggestionCard({
  suggestion,
  isApplied,
  onApply
}: {
  suggestion: AiSuggestion
  isApplied: boolean
  onApply: () => void
}) {
  const typeKey = (suggestion.type as keyof typeof typeConfig) in typeConfig
    ? (suggestion.type as keyof typeof typeConfig)
    : 'opportunity'
  
  const type = typeConfig[typeKey]
  const impact = impactConfig[suggestion.impact as keyof typeof impactConfig] || impactConfig.medium
  const Icon = type.icon

  // Texto da Ação
  const actionText = typeof suggestion.action === 'object' && suggestion.action?.description
    ? suggestion.action.description
    : typeof suggestion.action === 'string' && suggestion.action.trim().length > 0
    ? suggestion.action
    : 'Revisar métricas e ajustar parâmetros no gerenciador de anúncios.'

  // Melhoria de métrica
  const rawImprovement = suggestion.metrics?.estimatedImprovement || ''
  const hasImprovement = Boolean(rawImprovement && rawImprovement.trim().length > 0)

  return (
    <Card className={cn(
      'transition-all duration-200 border rounded-xl overflow-hidden bg-card/70',
      type.border,
      isApplied ? 'opacity-60 bg-muted/30 border-muted' : 'hover:shadow-md'
    )}>
      {/* Top Banner de Severidade */}
      <div className={cn('px-4 py-2 flex items-center justify-between border-b text-xs', type.bg, 'border-border/60')}>
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4 shrink-0', type.color)} />
          <span className={cn('font-bold tracking-tight', type.color)}>
            {type.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant={impact.variant} className="text-[10px] uppercase font-bold tracking-wider px-2 py-0 h-4">
            {impact.label}
          </Badge>
          {isApplied && (
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 h-4 gap-1">
              <CheckCircle2 className="h-2.5 w-2.5" /> Aplicado
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Título Principal */}
        <div>
          <h3 className={cn(
            'text-base sm:text-lg font-bold text-foreground leading-snug',
            isApplied && 'line-through text-muted-foreground'
          )}>
            {suggestion.title}
          </h3>
          {/* Diagnóstico Formatado */}
          <FormattedDescription text={suggestion.description} />
        </div>

        {/* Destaque de Impacto no Negócio (ROI / Economia) */}
        {hasImprovement && !isApplied && (
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs">
            <div className="h-6 w-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
            <div>
              <span className="font-bold text-emerald-300">Impacto Estimado no Negócio: </span>
              <span className="font-semibold text-emerald-400">{rawImprovement}</span>
            </div>
          </div>
        )}

        {/* Bloco de Execução Prática (O que fazer) */}
        {!isApplied && (
          <div className="p-3.5 rounded-lg bg-muted/60 border space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <Target className="h-3.5 w-3.5 text-primary" />
              <span>Plano de Execução Imediata</span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-foreground leading-relaxed">
              {actionText}
            </p>
            <div className="flex items-center justify-end pt-1">
              <Button
                size="sm"
                onClick={onApply}
                className="h-8 text-xs font-semibold px-3.5 gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Aplicar Diretriz</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {isApplied && (
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Diretriz estratégica aplicada com sucesso nas diretrizes da conta.</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
