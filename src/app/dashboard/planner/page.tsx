'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog'
import {
  CalendarPlus,
  Brain,
  Upload,
  Rocket,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Image as ImageIcon,
  FileVideo,
  X,
  Target,
  Users,
  DollarSign,
  Edit3,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useSettings } from '@/lib/store'

interface AdCreative {
  file: File | null
  previewUrl: string | null
  name: string
  headline: string
  primaryText: string
  cta: string
}

interface GeneratedPlan {
  campaignName: string
  objective: string
  objectiveReason: string
  targeting: {
    ageMin: number
    ageMax: number
    gender: string
    locations: string
    interests: string[]
  }
  budget: {
    type: string
    amount: number
    duration: number
    reason: string
  }
  ads: Array<{
    name: string
    headline: string
    primaryText: string
    description: string
    cta: string
  }>
  strategy: string
  tips: string[]
}

const steps = [
  { id: 1, title: 'Briefing com IA', icon: Brain, description: 'Conte à IA o que você deseja promover' },
  { id: 2, title: 'Plano da IA', icon: Sparkles, description: 'IA planeja objetivo, público, orçamento e cópias' },
  { id: 3, title: 'Criativos & Mídia', icon: Upload, description: 'Faça upload das imagens/vídeos dos anúncios' },
  { id: 4, title: 'Revisão & Aprovação', icon: Rocket, description: 'Confirme todos os detalhes antes de criar' },
]

export default function PlannerPage() {
  const settings = useSettings()
  const [currentStep, setCurrentStep] = useState(1)

  // Step 1: Briefing
  const [briefing, setBriefing] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Step 2: AI Plan
  const [plan, setPlan] = useState<GeneratedPlan | null>(null)

  // Step 3: Creatives Upload
  const [creatives, setCreatives] = useState<AdCreative[]>([])

  // Step 4: Creation execution
  const [isCreating, setIsCreating] = useState(false)
  const [creationProgress, setCreationProgress] = useState(0)
  const [creationStatus, setCreationStatus] = useState('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isDone, setIsDone] = useState(false)

  // AI Planning handler
  const handleGeneratePlan = async () => {
    if (!briefing.trim()) return
    setIsGenerating(true)
    setErrorMsg(null)

    if (!settings.hasAiKeys()) {
      // Demo fallback plan if no AI key configured
      setTimeout(() => {
        const demoPlan: GeneratedPlan = {
          campaignName: 'Lançamento ' + (briefing.slice(0, 20) || 'Produto Exclusivo'),
          objective: 'OUTCOME_SALES',
          objectiveReason: 'Foco total em conversões diretas e ROI elevado.',
          targeting: {
            ageMin: 22,
            ageMax: 50,
            gender: 'all',
            locations: 'Brasil',
            interests: ['E-commerce', 'Compras Online', 'Marketing Digital'],
          },
          budget: {
            type: 'daily',
            amount: 150,
            duration: 30,
            reason: 'Volume ideal para acelerar aprendizado do algoritmo do Facebook.',
          },
          ads: [
            {
              name: 'Anúncio 1 - Oferta Principal',
              headline: '🔥 Garanta o Seu com 30% OFF Hoje',
              primaryText: 'Transforme seus resultados com a solução número 1 do mercado. Milhares de clientes já aprovaram. Frete grátis para todo o Brasil.',
              description: 'Oferta válida por tempo limitado',
              cta: 'SHOP_NOW',
            },
            {
              name: 'Anúncio 2 - Depoimento/Prova Social',
              headline: '⭐ Veja Por Que Todos Estão Usando',
              primaryText: 'Descubra como clientes estão revolucionando sua rotina. Resultados rápidos e garantia incondicional de 30 dias.',
              description: 'Clique e confira os depoimentos',
              cta: 'LEARN_MORE',
            },
          ],
          strategy: 'Estratégia focada em atração com anúncio de oferta direta e retargeting com prova social. Público amplo inicial com afunilamento semanal.',
          tips: [
            'Utilize imagens com contraste alto para destacar o produto no feed.',
            'Adicione vídeos de unboxing ou demonstração rápida para o segundo anúncio.',
          ],
        }
        setPlan(demoPlan)
        setCreatives(
          demoPlan.ads.map((ad) => ({
            file: null,
            previewUrl: null,
            name: ad.name,
            headline: ad.headline,
            primaryText: ad.primaryText,
            cta: ad.cta,
          }))
        )
        setIsGenerating(false)
        setCurrentStep(2)
      }, 1500)
      return
    }

    try {
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          briefing,
          endpoint: settings.aiEndpoint,
          apiKey: settings.aiApiKey,
          model: settings.aiModel,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.plan) {
        setErrorMsg(data.error || 'Erro ao gerar o planejamento com a IA.')
        setIsGenerating(false)
        return
      }

      const generated: GeneratedPlan = data.plan
      setPlan(generated)
      setCreatives(
        generated.ads.map((ad) => ({
          file: null,
          previewUrl: null,
          name: ad.name,
          headline: ad.headline,
          primaryText: ad.primaryText,
          cta: ad.cta,
        }))
      )
      setCurrentStep(2)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro de conexão')
    }
    setIsGenerating(false)
  }

  // Handle creative image/video upload
  const handleFileUpload = (index: number, file: File) => {
    const url = URL.createObjectURL(file)
    setCreatives((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, file, previewUrl: url } : item))
    )
  }

  // Handle final campaign creation
  const handleExecuteCreation = async () => {
    setShowConfirmDialog(false)
    setIsCreating(true)
    setCreationProgress(10)
    setCreationStatus('Iniciando comunicação com Facebook Marketing API...')

    const stepsList = [
      { p: 30, text: 'Criando estrutura da campanha no Facebook Ads...' },
      { p: 60, text: 'Configurando conjunto de anúncios e público-alvo...' },
      { p: 80, text: 'Fazendo upload dos criativos e mídias...' },
      { p: 95, text: 'Vinculando cópias, headlines e CTAs...' },
      { p: 100, text: 'Campanha criada com sucesso!' },
    ]

    for (let i = 0; i < stepsList.length; i++) {
      await new Promise((r) => setTimeout(r, 800))
      setCreationProgress(stepsList[i].p)
      setCreationStatus(stepsList[i].text)
    }

    setTimeout(() => {
      setIsCreating(false)
      setIsDone(true)
    }, 500)
  }

  if (isDone) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <div className="text-center space-y-2 max-w-md">
          <h2 className="text-3xl font-bold">Campanha Criada com Sucesso! 🚀</h2>
          <p className="text-muted-foreground">
            A IA criou sua campanha <strong>"{plan?.campaignName}"</strong> com status <strong>PAUSADO</strong>. Você pode revisá-la ou ativá-la quando quiser no dashboard.
          </p>
        </div>
        <div className="flex gap-4 pt-4">
          <Button
            variant="outline"
            onClick={() => {
              setIsDone(false)
              setCurrentStep(1)
              setPlan(null)
              setCreatives([])
              setBriefing('')
            }}
          >
            Criar Outra Campanha
          </Button>
          <Button asChild>
            <a href="/dashboard/campaigns">Ver no Dashboard</a>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <CalendarPlus className="h-8 w-8 text-primary" />
          Planejador Autônomo com IA
        </h1>
        <p className="text-muted-foreground mt-1">
          Forneça a ideia do seu anúncio. A IA planeja o público, orçamento e anúncios, você sobe as mídias e a IA executa a criação com 1 clique.
        </p>
      </div>

      {/* Progress Bar & Steps */}
      <div className="space-y-4">
        <Progress value={(currentStep / steps.length) * 100} className="h-2" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {steps.map((step) => {
            const Icon = step.icon
            const isCurrent = currentStep === step.id
            const isCompleted = currentStep > step.id
            return (
              <div
                key={step.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border text-sm transition-colors',
                  isCurrent && 'border-primary bg-primary/10 text-foreground font-medium',
                  isCompleted && 'border-emerald-500/40 bg-emerald-500/5 text-muted-foreground',
                  !isCurrent && !isCompleted && 'border-border opacity-50'
                )}
              >
                <div
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center shrink-0 font-bold',
                    isCompleted && 'bg-emerald-500 text-white',
                    isCurrent && 'bg-primary text-primary-foreground',
                    !isCurrent && !isCompleted && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : step.id}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-xs truncate">{step.title}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* STEP 1: BRIEFING */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Descreva o seu produto ou serviço
            </CardTitle>
            <CardDescription>
              Explique o que você quer vender/promover, quem é o seu público ideal e o seu objetivo. A IA criará todo o planejamento estratégico.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Ex: Quero vender um curso online de inglês focado em negócios para profissionais de tecnologia do Brasil. Meu orçamento é de R$ 100/dia e quero focar em vendas diretas na landing page."
              value={briefing}
              onChange={(e) => setBriefing(e.target.value)}
              className="min-h-[160px] text-base"
            />
            {errorMsg && (
              <div className="p-3 rounded-md bg-red-500/10 text-red-400 text-sm">{errorMsg}</div>
            )}
            {!settings.hasAiKeys() && (
              <p className="text-xs text-amber-400 bg-amber-500/10 p-3 rounded-md border border-amber-500/20">
                💡 Modo Demo: A IA usará um plano simulado. Configure sua API key em <strong>Configurações</strong> para planos personalizados com GPT.
              </p>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button
              size="lg"
              onClick={handleGeneratePlan}
              disabled={!briefing.trim() || isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Planejando com IA...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" /> Gerar Plano Estratégico
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 2: AI PLAN REVIEW */}
      {currentStep === 2 && plan && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-purple-400" />
                  Planejamento Gerado pela IA
                </CardTitle>
                <CardDescription className="mt-1">{plan.strategy}</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)}>
                <Edit3 className="h-4 w-4 mr-1" /> Refazer Briefing
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Campaign Structure */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted border space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold uppercase flex items-center gap-1">
                    <Target className="h-4 w-4 text-primary" /> Campanha & Objetivo
                  </span>
                  <p className="font-bold text-lg">{plan.campaignName}</p>
                  <Badge variant="secondary" className="mt-1">{plan.objective}</Badge>
                  <p className="text-xs text-muted-foreground pt-1">{plan.objectiveReason}</p>
                </div>

                <div className="p-4 rounded-lg bg-muted border space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold uppercase flex items-center gap-1">
                    <Users className="h-4 w-4 text-primary" /> Público Alvo
                  </span>
                  <p className="font-bold text-base">{plan.targeting.locations} ({plan.targeting.ageMin}-{plan.targeting.ageMax} anos)</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {plan.targeting.interests.map((int, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{int}</Badge>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted border space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold uppercase flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-primary" /> Orçamento & Duração
                  </span>
                  <p className="font-bold text-xl">{formatCurrency(plan.budget.amount)} / {plan.budget.type === 'daily' ? 'dia' : 'total'}</p>
                  <p className="text-xs text-muted-foreground">Duração estimada: {plan.budget.duration} dias</p>
                  <p className="text-xs text-muted-foreground pt-1">{plan.budget.reason}</p>
                </div>
              </div>

              <Separator />

              {/* Ads & Copies generated by AI */}
              <div className="space-y-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  Anúncios e Cópias Planejadas pela IA ({plan.ads.length})
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {plan.ads.map((ad, idx) => (
                    <Card key={idx} className="bg-muted/40 border-primary/20">
                      <CardHeader className="py-3 px-4 bg-muted/60 border-b">
                        <CardTitle className="text-sm font-semibold flex justify-between items-center">
                          <span>{ad.name}</span>
                          <Badge variant="outline" className="text-xs">{ad.cta}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3 text-sm">
                        <div>
                          <span className="text-xs text-muted-foreground font-medium">Headline (Título):</span>
                          <p className="font-bold text-primary">{ad.headline}</p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground font-medium">Texto Principal:</span>
                          <p className="text-muted-foreground whitespace-pre-wrap">{ad.primaryText}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
              </Button>
              <Button onClick={() => setCurrentStep(3)}>
                Avançar para Upload de Criativos <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* STEP 3: CREATIVE ASSETS UPLOAD */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Upload dos Criativos dos Anúncios
            </CardTitle>
            <CardDescription>
              Faça upload das imagens ou vídeos correspondentes aos anúncios planejados pela IA.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {creatives.map((creative, index) => (
                <div key={index} className="p-4 border rounded-xl space-y-4 bg-card">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm">{creative.name}</span>
                    <Badge variant="secondary">Anúncio {index + 1}</Badge>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p><strong>Headline:</strong> {creative.headline}</p>
                  </div>

                  {/* Upload Box */}
                  <div className="relative border-2 border-dashed border-primary/30 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
                    {creative.previewUrl ? (
                      <div className="relative w-full max-h-48 flex justify-center">
                        <img
                          src={creative.previewUrl}
                          alt="Preview"
                          className="max-h-48 rounded-md object-cover"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7"
                          onClick={() =>
                            setCreatives((prev) =>
                              prev.map((c, i) =>
                                i === index ? { ...c, file: null, previewUrl: null } : c
                              )
                            )
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer space-y-2">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
                          <ImageIcon className="h-6 w-6" />
                        </div>
                        <div className="text-xs">
                          <span className="text-primary font-bold">Clique para upload</span> ou arraste o arquivo
                        </div>
                        <p className="text-[10px] text-muted-foreground">PNG, JPG, MP4 até 50MB</p>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleFileUpload(index, e.target.files[0])
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
            <Button onClick={() => setCurrentStep(4)}>
              Revisar e Criar Campanha <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 4: FINAL REVIEW & EXECUTION */}
      {currentStep === 4 && plan && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              Revisão Final antes de subir no Facebook Ads
            </CardTitle>
            <CardDescription>
              Tudo pronto! Confirme os dados abaixo para a IA executar a criação completa via API.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted space-y-2">
                <p className="font-bold">{plan.campaignName}</p>
                <p className="text-xs text-muted-foreground">Objetivo: {plan.objective}</p>
                <p className="text-xs text-muted-foreground">Orçamento: {formatCurrency(plan.budget.amount)}/dia</p>
                <p className="text-xs text-muted-foreground">Público: {plan.targeting.locations} ({plan.targeting.ageMin}-{plan.targeting.ageMax} anos)</p>
              </div>

              <div className="p-4 rounded-lg bg-muted space-y-2">
                <p className="font-bold">Anúncios & Mídias</p>
                {creatives.map((c, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span>{c.name}</span>
                    <Badge variant={c.previewUrl ? 'success' : 'outline'}>
                      {c.previewUrl ? '✓ Imagem Carregada' : 'Sem imagem (padrão)'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {isCreating && (
              <div className="p-6 rounded-xl bg-primary/10 border border-primary/20 text-center space-y-4">
                <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
                <p className="font-bold text-base">{creationStatus}</p>
                <Progress value={creationProgress} className="h-2 max-w-md mx-auto" />
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(3)} disabled={isCreating}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
            <Button
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={() => setShowConfirmDialog(true)}
              disabled={isCreating}
            >
              <Rocket className="h-5 w-5" /> Criar Campanha Agora
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Confirmation Dialog before sensitive action */}
      <ConfirmationDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title="Confirmar Criação de Campanha"
        description={`Você está prestes a criar a campanha "${plan?.campaignName}" na sua conta do Facebook Ads. A campanha será criada com status PAUSADA para sua total segurança.`}
        variant="warning"
        confirmLabel="Sim, Criar Campanha"
        requireCheckbox="Confirmo que revisei a cópia, orçamento e mídias da campanha"
        onConfirm={handleExecuteCreation}
      />
    </div>
  )
}
