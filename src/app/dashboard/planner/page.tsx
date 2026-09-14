'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  CalendarPlus,
  Brain,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Target,
  Users,
  FileText,
  Lightbulb,
  RotateCcw
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useSettings } from '@/lib/store'

export default function PlannerPage() {
  const settings = useSettings()
  const [briefing, setBriefing] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [plan, setPlan] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  const handleGeneratePlan = async () => {
    if (!briefing.trim() || isGenerating) return
    setIsGenerating(true)

    try {
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          briefing,
          endpoint: settings.aiEndpoint,
          apiKey: settings.aiApiKey,
          model: settings.aiModel,
          fbAccessToken: settings.fbAccessToken,
        }),
      })

      const data = await res.json()
      if (res.ok && data.plan) {
        setPlan(data.plan)
      } else {
        alert('Erro ao gerar plano: ' + (data.error || 'Tente novamente.'))
      }
    } catch {
      alert('Erro de conexão ao gerar plano estratégico.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyPlan = () => {
    if (!plan) return
    const text = `ESTRUTURA DA CAMPANHA (FACEBOOK ADS)
=====================================
Nome da Campanha: ${plan.campaignName}
Objetivo: ${plan.objective}
Motivo da Escolha: ${plan.objectiveReason}

CONJUNTO DE ANÚNCIOS
--------------------
Orçamento Sugerido: ${plan.budget ? formatCurrency(plan.budget.amount) : 'R$ 50,00'}/dia
Idade: ${plan.targeting?.ageMin} a ${plan.targeting?.ageMax} anos
Gênero: ${plan.targeting?.gender}
Localização: ${plan.targeting?.locations}
Interesses / Públicos: ${Array.isArray(plan.targeting?.interests) ? plan.targeting.interests.join(', ') : plan.targeting?.interests}
Públicos Personalizados / Advantage+: ${plan.targeting?.customAudiences || 'Segmentação ampla Advantage+'}

ANÚNCIOS & COPYS
----------------
${plan.ads?.map((ad: any, i: number) => `Anúncio ${i + 1}: ${ad.name}
Headline: ${ad.headline}
Texto Principal: ${ad.primaryText}
Descrição: ${ad.description}
CTA: ${ad.cta}
`).join('\n')}
ESTRATÉGIA DE VEICULAÇÃO
------------------------
${plan.strategy}

Dicas Práticas:
${plan.tips?.map((t: string) => `- ${t}`).join('\n')}
`

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <CalendarPlus className="h-8 w-8 text-primary" />
          Planejador de Campanhas
        </h1>
        <p className="text-muted-foreground mt-1">
          Gere a estrutura de como montar sua campanha no Facebook Ads Manager com base nas melhores práticas do algoritmo.
        </p>
      </div>

      {/* Briefing Input */}
      {!plan && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Descreva seu Produto ou Oferta
            </CardTitle>
            <CardDescription>
              Explique o que você quer vender ou anunciar, quem é seu público-alvo e qual é o objetivo (Vendas no Site, Mensagens no WhatsApp, etc). A IA desenhará toda a arquitetura de montagem.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={briefing}
              onChange={(e) => setBriefing(e.target.value)}
              placeholder="Ex: Quero vender uma consultoria de negócios para médicos do Brasil. Meu orçamento inicial é de R$ 80/dia e quero que os interessados mandem mensagem direto no WhatsApp para fechar."
              className="min-h-[140px] text-base leading-relaxed"
            />
            <div className="flex justify-end">
              <Button
                size="lg"
                onClick={handleGeneratePlan}
                disabled={isGenerating || !briefing.trim()}
                className="gap-2"
              >
                {isGenerating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Planejando Estrutura...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Gerar Plano de Campanha</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Strategy / Plan Display */}
      {plan && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card">
            <div>
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Estratégia Pronta</span>
              <h2 className="text-xl font-bold">{plan.campaignName}</h2>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setPlan(null)} className="gap-2">
                <RotateCcw className="h-4 w-4" /> Novo Plano
              </Button>
              <Button onClick={handleCopyPlan} className="gap-2 flex-1 sm:flex-none">
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copiado!' : 'Copiar Toda a Estrutura'}
              </Button>
            </div>
          </div>

          {/* 1. Nível de Campanha */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2 text-primary">
                <Target className="h-5 w-5" /> 1. Como Configurar a Campanha no Gerenciador
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-sm">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-3 bg-muted/40 rounded-lg border">
                  <span className="text-xs text-muted-foreground">Nome Sugerido:</span>
                  <p className="font-semibold text-base">{plan.campaignName}</p>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg border">
                  <span className="text-xs text-muted-foreground">Objetivo de Campanha (Meta):</span>
                  <div className="mt-1">
                    <Badge variant="default" className="text-xs">{plan.objective}</Badge>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 text-xs leading-relaxed">
                <strong>Por que este objetivo? </strong>
                {plan.objectiveReason}
              </div>
            </CardContent>
          </Card>

          {/* 2. Nível de Conjunto de Anúncios */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2 text-primary">
                <Users className="h-5 w-5" /> 2. Como Configurar o Conjunto de Anúncios
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-sm">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="p-3 bg-muted/40 rounded-lg border">
                  <span className="text-xs text-muted-foreground">Orçamento Diário:</span>
                  <p className="font-bold text-base text-emerald-400">
                    {plan.budget ? formatCurrency(plan.budget.amount) : 'R$ 50,00'}/dia
                  </p>
                  <span className="text-[11px] text-muted-foreground">{plan.budget?.reason}</span>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg border">
                  <span className="text-xs text-muted-foreground">Idade & Gênero:</span>
                  <p className="font-semibold">
                    {plan.targeting?.ageMin} a {plan.targeting?.ageMax} anos ({plan.targeting?.gender || 'Todos'})
                  </p>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg border">
                  <span className="text-xs text-muted-foreground">Localização:</span>
                  <p className="font-semibold">{plan.targeting?.locations || 'Brasil'}</p>
                </div>
              </div>

              <div className="p-4 bg-muted/40 rounded-lg border space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Públicos & Interesses Oficiais da Meta:
                </span>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(plan.targeting?.interests) ? (
                    plan.targeting.interests.map((it: string, i: number) => (
                      <Badge key={i} variant="secondary" className="px-2.5 py-1 text-xs">
                        {it}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="secondary">{plan.targeting?.interests}</Badge>
                  )}
                </div>
                {plan.targeting?.customAudiences && (
                  <p className="text-xs text-muted-foreground pt-1">
                    <strong>Público Personalizado: </strong>{plan.targeting.customAudiences}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 3. Nível de Anúncios e Copys */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2 text-primary">
                <FileText className="h-5 w-5" /> 3. Copys e Anúncios Prontos para Usar
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {plan.ads?.map((ad: any, index: number) => (
                  <div key={index} className="p-4 rounded-xl border bg-muted/30 space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs uppercase text-primary">Anúncio {index + 1}</span>
                      <Badge variant="outline" className="text-[10px]">{ad.cta || 'SAIBA_MAIS'}</Badge>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground font-semibold">Título (Headline):</span>
                      <p className="font-bold text-base mt-0.5">{ad.headline}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground font-semibold">Texto Principal (Copy):</span>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-0.5 whitespace-pre-wrap">{ad.primaryText}</p>
                    </div>
                    {ad.description && (
                      <div>
                        <span className="text-[11px] text-muted-foreground font-semibold">Descrição do Link:</span>
                        <p className="text-xs text-muted-foreground mt-0.5">{ad.description}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 4. Estratégia de Veiculação */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2 text-primary">
                <Lightbulb className="h-5 w-5" /> 4. Dicas e Estratégia do Gestor
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-sm">
              <p className="text-muted-foreground leading-relaxed">{plan.strategy}</p>
              {plan.tips && (
                <div className="space-y-1.5 pt-2 border-t text-xs text-muted-foreground">
                  {plan.tips.map((tip: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-primary font-bold">✓</span>
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
