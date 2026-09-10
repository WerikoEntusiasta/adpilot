'use client'

import { useEffect, useState } from 'react'
import type { AiSuggestion, Campaign } from '@/lib/mock-data'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog'
import { Brain, TrendingUp, AlertTriangle, Lightbulb, Sparkles, Send, CheckCircle2, X, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettings } from '@/lib/store'

// Configuração visual para cada tipo de sugestão da IA (Ícones e Cores)
const typeConfig = {
  improvement: { label: 'Melhoria', icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  warning: { label: 'Alerta', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  new_campaign: { label: 'Nova Campanha', icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  opportunity: { label: 'Oportunidade', icon: Lightbulb, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
}

// Configuração visual para o nível de impacto da sugestão
const impactConfig = {
  high: { label: 'Alto Impacto', variant: 'destructive' as const },
  medium: { label: 'Médio Impacto', variant: 'warning' as const },
  low: { label: 'Baixo Impacto', variant: 'secondary' as const },
}

export default function AdvisorPage() {
  const settings = useSettings()
  
  // Estado para garantir que a renderização do cliente e servidor batam (Next.js Hydration)
  const [mounted, setMounted] = useState(false)
  
  // Array de sugestões que virão da IA. Inicialmente vazio (remover dados fictícios)
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([])
  
  // Campanhas reais trazidas do Facebook
  const [realCampaigns, setRealCampaigns] = useState<Campaign[]>([])
  
  // Modal de confirmação ao aplicar sugestão
  const [selectedSuggestion, setSelectedSuggestion] = useState<AiSuggestion | null>(null)
  
  // Histórico de quais IDs já foram aplicados para evitar duplicação
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())
  
  // Estado de carregamento da análise principal
  const [isAnalyzingReal, setIsAnalyzingReal] = useState(false)

  // Mensagens do chat lateral de suporte com o Agente de Tráfego Pago
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'assistant', content: 'Olá! Sou o AdPilot AI Advisor, seu Especialista Sênior em Tráfego Pago. Estou analisando seus dados reais. Como posso te ajudar a escalar hoje?' },
  ])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)

  const hasFb = settings.hasFbKeys()

  // Sincroniza o estado de 'mounted' logo após o carregamento da página
  useEffect(() => {
    setMounted(true)
  }, [])

  // Carrega as campanhas reais do Facebook automaticamente se o usuário tiver as chaves configuradas
  useEffect(() => {
    if (mounted && hasFb) {
      fetch('/api/facebook/campaigns', {
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
          setRealCampaigns(data.campaigns)
        }
      })
      .catch(e => console.error('Erro ao buscar campanhas do Facebook:', e))
    }
  }, [mounted, hasFb, settings.fbAccessToken, settings.fbAdAccountId, settings.useAdminFbToken])

  // Função disparada ao clicar em "Analisar Minhas Campanhas Agora"
  const handleAnalyzeReal = async () => {
    if (!settings.hasAiKeys()) {
      alert('IA não está configurada pelo Administrador.')
      return
    }
    
    setIsAnalyzingReal(true)
    try {
      // 🚨 REMOVIDO mockSuggestions! Agora a IA analisa SÓ as campanhas reais.
      // Se não tiver campanhas reais, manda um array vazio e a IA fará o trabalho de avisar o usuário.
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaigns: realCampaigns,
          endpoint: settings.aiEndpoint,
          apiKey: settings.aiApiKey,
          model: settings.aiModel,
        }),
      })

      const data = await res.json()
      if (res.ok && data.suggestions) {
        setSuggestions(data.suggestions)
      } else {
        alert('Erro ao analisar: ' + (data.error || 'Desconhecido'))
      }
    } catch (e) {
      console.error(e)
      alert('Erro de conexão ao analisar.')
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

    // Contexto extra adicionado de forma invisível para que a IA saiba os dados das campanhas atuais
    const contextPrompt = \\n\n[CONTEXTO DO SISTEMA INVISÍVEL AO USUÁRIO]: O usuário possui atualmente as seguintes campanhas ativas no Facebook: \\

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...newMessages.slice(0, -1),
            { role: 'user', content: newMessages[newMessages.length - 1].content + contextPrompt },
          ],
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

  if (!mounted) return null

  if (!settings.hasAiKeys()) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <Brain className="h-16 w-16 text-muted-foreground opacity-50" />
        <h2 className="text-xl font-semibold">IA Não Configurada</h2>
        <p className="text-muted-foreground text-center max-w-md">
          O Administrador ainda não configurou as credenciais da Inteligência Artificial. Volte mais tarde.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Brain className="h-8 w-8 text-primary" />
          AI Advisor
        </h1>
        <p className="text-muted-foreground mt-1">Seu consultor especialista em tráfego pago. Analisa suas campanhas ativas reais e gera insights baseados nos algoritmos mais recentes da Meta.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Painel Central: Sugestões e Ações */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-lg">Análise Dinâmica</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {realCampaigns.length > 0 
                      ? \Conectado a \ campanhas reais.\ 
                      : 'Nenhuma campanha carregada ou Meta Ads não configurado.'}
                  </p>
                </div>
                <Button 
                  onClick={handleAnalyzeReal} 
                  disabled={isAnalyzingReal || realCampaigns.length === 0} 
                  className="shadow-lg shadow-primary/20 shrink-0"
                >
                  {isAnalyzingReal ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analisando Dados...</>
                  ) : (
                    <><RefreshCw className="mr-2 h-4 w-4" /> Analisar Minhas Campanhas Agora</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Sugestões Renderizadas */}
          <Tabs defaultValue="all">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="improvement">Melhorias</TabsTrigger>
                <TabsTrigger value="warning">Alertas</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="space-y-4">
              {suggestions.length === 0 && !isAnalyzingReal && (
                <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg">
                  <Brain className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Nenhuma sugestão no momento. Clique em Analisar para começar.</p>
                </div>
              )}
              {suggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  isApplied={appliedIds.has(suggestion.id)}
                  onApply={() => setSelectedSuggestion(suggestion)}
                />
              ))}
            </TabsContent>
            {/* ... Demais abas com filtro similiar omitidas para simplificar ... */}
          </Tabs>
        </div>

        {/* Sidebar: Assistente Pessoal (Chat) */}
        <div className="lg:col-span-1">
          <Card className="flex flex-col h-[calc(100vh-12rem)] sticky top-6">
            <CardHeader className="border-b bg-muted/30 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Assistente AdPilot
              </CardTitle>
              <CardDescription>Especialista Senior em Tráfego Pago 24/7</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((msg, i) => (
                <div key={i} className={cn('flex flex-col', msg.role === 'user' ? 'items-end' : 'items-start')}>
                  <div
                    className={cn(
                      'px-4 py-2 rounded-2xl max-w-[85%] text-sm',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted rounded-tl-sm'
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex items-start">
                  <div className="bg-muted px-4 py-2 rounded-2xl rounded-tl-sm max-w-[85%] text-sm flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Digitando...
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="p-4 pt-2 border-t">
              <form
                onSubmit={(e) => { e.preventDefault(); handleChat() }}
                className="flex w-full gap-2 items-center"
              >
                <Textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ex: Como reduzo o CPA da campanha X?"
                  className="min-h-[44px] h-[44px] resize-none pr-10 rounded-full"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleChat()
                    }
                  }}
                />
                <Button type="submit" size="icon" className="shrink-0 rounded-full h-11 w-11" disabled={isChatLoading || !chatInput.trim()}>
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
          isOpen={true}
          onClose={() => setSelectedSuggestion(null)}
          onConfirm={() => handleApply(selectedSuggestion.id)}
          title="Aplicar Recomendação"
          description={
            <div className="space-y-4 mt-4">
              <p>Você está prestes a aplicar a seguinte recomendação na sua campanha através da API do Facebook (Simulação):</p>
              <div className="p-4 bg-muted rounded-lg text-sm">
                <strong>{selectedSuggestion.title}</strong>
                <p className="mt-1 text-muted-foreground">{selectedSuggestion.action.description}</p>
              </div>
              <p className="text-xs text-amber-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Atenção: Mudanças de orçamento podem resetar o aprendizado da campanha.
              </p>
            </div>
          }
          confirmText="Sim, Aplicar Mudança"
          cancelText="Cancelar"
          variant="default"
        />
      )}
    </div>
  )
}

// Sub-componente para renderizar a sugestão individual (Melhoria de código/separação de responsabilidade)
function SuggestionCard({ suggestion, isApplied, onApply }: { suggestion: AiSuggestion, isApplied: boolean, onApply: () => void }) {
  const type = typeConfig[suggestion.type as keyof typeof typeConfig] || typeConfig.opportunity
  const impact = impactConfig[suggestion.impact as keyof typeof impactConfig]
  const Icon = type.icon

  return (
    <Card className={cn('transition-all duration-200', isApplied ? 'opacity-60 bg-muted/50' : 'hover:border-primary/50')}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className={cn('p-3 rounded-xl shrink-0', type.bg)}>
              <Icon className={cn('h-6 w-6', type.color)} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className={cn('font-bold text-lg', isApplied && 'line-through decoration-2')}>{suggestion.title}</h3>
                <Badge variant={impact.variant} className="text-[10px] uppercase">{impact.label}</Badge>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">{suggestion.description}</p>
              
              {!isApplied && (
                <div className="bg-muted p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-sm">
                    <span className="font-semibold text-primary">Ação Recomendada: </span>
                    {suggestion.action.description}
                  </div>
                  <Button size="sm" onClick={onApply} className="shrink-0">
                    Aplicar Mudança
                  </Button>
                </div>
              )}
              {isApplied && (
                <div className="text-emerald-500 text-sm font-medium flex items-center gap-2 mt-2">
                  <CheckCircle2 className="h-4 w-4" /> Recomendação aplicada com sucesso
                </div>
              )}
            </div>
          </div>
          {suggestion.metrics && !isApplied && (
            <div className="hidden md:flex shrink-0 text-right flex-col gap-1">
              <span className="text-xs text-muted-foreground">Impacto Estimado</span>
              <span className="font-bold text-emerald-500">+{suggestion.metrics.estimatedImprovement}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
