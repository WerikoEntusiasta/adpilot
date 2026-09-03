'use client'

import { useEffect, useState } from 'react'
import { mockSuggestions, type AiSuggestion, type Campaign } from '@/lib/mock-data'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog'
import { Brain, TrendingUp, AlertTriangle, Lightbulb, Sparkles, Send, CheckCircle2, X, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettings } from '@/lib/store'

const typeConfig = {
  improvement: { label: 'Melhoria', icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  warning: { label: 'Alerta', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  new_campaign: { label: 'Nova Campanha', icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  opportunity: { label: 'Oportunidade', icon: Lightbulb, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
}

const impactConfig = {
  high: { label: 'Alto Impacto', variant: 'destructive' as const },
  medium: { label: 'Médio Impacto', variant: 'warning' as const },
  low: { label: 'Baixo Impacto', variant: 'secondary' as const },
}

export default function AdvisorPage() {
  const settings = useSettings()
  const [mounted, setMounted] = useState(false)
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>(mockSuggestions)
  const [realCampaigns, setRealCampaigns] = useState<Campaign[]>([])
  const [selectedSuggestion, setSelectedSuggestion] = useState<AiSuggestion | null>(null)
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())
  const [isAnalyzingReal, setIsAnalyzingReal] = useState(false)

  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'assistant', content: 'Olá! Sou o AdPilot AI Advisor. Estou conectado às suas estatísticas do Facebook Ads. Como posso ajudar a otimizar seus anúncios hoje?' },
  ])
  const [chatInput, setChatInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)

  const hasAi = settings.hasAiKeys()
  const hasFb = settings.hasFbKeys()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Load real campaigns from Facebook API when mounted
  useEffect(() => {
    if (mounted && hasFb) {
      fetch('/api/facebook/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: settings.fbAccessToken,
          adAccountId: settings.fbAdAccountId,
          useAdminToken: settings.useAdminFbToken,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.campaigns) {
            setRealCampaigns(data.campaigns)
          }
        })
        .catch((err) => console.error('Erro ao buscar campanhas no Advisor:', err))
    }
  }, [mounted, hasFb, settings.fbAccessToken, settings.fbAdAccountId])

  // Run AI analysis over real campaigns
  const analyzeRealCampaignsWithAi = async () => {
    if (!hasAi) return
    setIsAnalyzingReal(true)
    try {
      const campaignsToAnalyze = realCampaigns.length > 0 ? realCampaigns : mockSuggestions
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaigns: campaignsToAnalyze,
          endpoint: settings.aiEndpoint,
          apiKey: settings.aiApiKey,
          model: settings.aiModel,
        }),
      })

      const data = await res.json()
      if (res.ok && data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions)
      }
    } catch (err) {
      console.error('Erro na análise da IA:', err)
    }
    setIsAnalyzingReal(false)
  }

  const handleApply = (suggestion: AiSuggestion) => {
    setAppliedIds(prev => new Set(prev).add(suggestion.id))
    setSelectedSuggestion(null)
  }

  const handleDismiss = (id: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== id))
  }

  const handleChat = async () => {
    if (!chatInput.trim()) return
    const userMsg = chatInput.trim()
    const newMessages = [...chatMessages, { role: 'user' as const, content: userMsg }]
    setChatMessages(newMessages)
    setChatInput('')
    setIsTyping(true)
    setChatError(null)

    if (!hasAi) {
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `Analisando "${userMsg.slice(0, 50)}"...\n\nBaseado nos dados das suas campanhas:\n1. Recomendo focar nos conjuntos de maior CTR.\n2. Ajuste o orçamento de forma gradual.\n\n⚠️ *Configure sua chave de IA em Configurações para respostas em tempo real com GPT.*`,
        }])
        setIsTyping(false)
      }, 1000)
      return
    }

    // Add context of real campaigns into the system context
    const contextPrompt = realCampaigns.length > 0
      ? `\n\n[CONTEXTO DE CAMPANHAS REAIS DO USUÁRIO]:\n${JSON.stringify(realCampaigns, null, 2)}`
      : ''

    try {
      const messagesWithContext = [
        ...newMessages.slice(0, -1),
        { role: 'user', content: newMessages[newMessages.length - 1].content + contextPrompt },
      ]

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: settings.aiEndpoint,
          apiKey: settings.aiApiKey,
          model: settings.aiModel,
          messages: messagesWithContext,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setChatError(data.error || 'Erro ao se comunicar com a IA')
        setIsTyping(false)
        return
      }

      setChatMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Erro de conexão')
    }
    setIsTyping(false)
  }

  if (!mounted) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" />
            IA Advisor
          </h1>
          <p className="text-muted-foreground mt-1">Análise estratégica e sugestões em tempo real</p>
        </div>

        {hasAi && (
          <Button variant="outline" onClick={analyzeRealCampaignsWithAi} disabled={isAnalyzingReal}>
            {isAnalyzingReal ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2 text-purple-400" />}
            {isAnalyzingReal ? 'Analisando Campanhas...' : 'Gerar Novas Sugestões com IA'}
          </Button>
        )}
      </div>

      {!hasAi && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
          <p>
            <span className="font-medium text-amber-400">Modo demo.</span>{' '}
            Configure seu endpoint e chave de IA em{' '}
            <a href="/dashboard/settings" className="text-primary underline">Configurações</a>{' '}
            para que a IA analise seus dados reais do Facebook.
          </p>
        </div>
      )}

      <Tabs defaultValue="suggestions">
        <TabsList>
          <TabsTrigger value="suggestions">Sugestões de Otimização ({suggestions.length})</TabsTrigger>
          <TabsTrigger value="chat">
            Chat com IA
            {hasAi && <span className="ml-1.5 h-2 w-2 rounded-full bg-emerald-500 inline-block" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="space-y-4 mt-4">
          {suggestions.map((suggestion) => {
            const config = typeConfig[suggestion.type] || typeConfig.improvement
            const impact = impactConfig[suggestion.impact] || impactConfig.medium
            const isApplied = appliedIds.has(suggestion.id)

            return (
              <Card key={suggestion.id} className={cn(isApplied && 'opacity-60')}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', config.bg)}>
                        <config.icon className={cn('h-5 w-5', config.color)} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{suggestion.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{config.label}</Badge>
                          <Badge variant={impact.variant}>{impact.label}</Badge>
                          {suggestion.campaignName && (
                            <span className="text-xs text-muted-foreground">• {suggestion.campaignName}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isApplied && (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Aplicado
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                </CardContent>
                {!isApplied && (
                  <CardFooter className="gap-2">
                    <Button size="sm" onClick={() => setSelectedSuggestion(suggestion)}>
                      Aplicar Sugestão
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDismiss(suggestion.id)}>
                      <X className="h-4 w-4 mr-1" /> Descartar
                    </Button>
                  </CardFooter>
                )}
              </Card>
            )
          })}

          {suggestions.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4" />
                <p className="text-lg font-medium">Tudo otimizado!</p>
                <p className="text-sm text-muted-foreground">Não há sugestões pendentes no momento.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          <Card className="flex flex-col h-[600px]">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Chat com AdPilot AI
                {hasAi && <Badge variant="success" className="text-xs">Conectado</Badge>}
              </CardTitle>
              <CardDescription>
                {hasFb && realCampaigns.length > 0
                  ? `Analisando ${realCampaigns.length} campanhas reais da sua conta do Facebook`
                  : 'Pergunte sobre estratégias de anúncios, orçamentos e criativos'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-4">
              {chatMessages.map((msg, i) => (
                <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    'max-w-[80%] rounded-lg px-4 py-3 text-sm whitespace-pre-wrap',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-3 text-sm flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Analisando suas campanhas...
                  </div>
                </div>
              )}
              {chatError && (
                <div className="flex justify-start">
                  <div className="bg-red-500/10 text-red-400 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> {chatError}
                  </div>
                </div>
              )}
            </CardContent>
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Textarea
                  placeholder={hasAi ? 'Pergunte algo sobre suas campanhas...' : 'Modo demo — configure a IA em Configurações para respostas reais'}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChat() } }}
                  className="min-h-[44px] max-h-[120px] resize-none"
                  rows={1}
                />
                <Button size="icon" onClick={handleChat} disabled={!chatInput.trim() || isTyping}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={!!selectedSuggestion}
        onOpenChange={(open) => !open && setSelectedSuggestion(null)}
        title="Aplicar Sugestão"
        description={selectedSuggestion ? `Deseja aplicar a sugestão: "${selectedSuggestion.title}"? Esta ação modificará sua campanha no Facebook Ads.` : ''}
        variant="warning"
        confirmLabel="Aplicar Sugestão"
        requireCheckbox="Confirmo que revisei a sugestão e desejo aplicá-la"
        onConfirm={() => selectedSuggestion && handleApply(selectedSuggestion)}
      >
        {selectedSuggestion && (
          <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
            <p className="font-medium">Detalhes da ação:</p>
            <p className="text-muted-foreground">{selectedSuggestion.description}</p>
          </div>
        )}
      </ConfirmationDialog>
    </div>
  )
}
