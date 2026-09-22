'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  Clock,
  Film,
  ShieldAlert,
  Brain,
  Layers,
  ArrowRight,
  CheckCircle2,
  Activity,
} from 'lucide-react'

const STORAGE_KEY = 'adpilot_whats_new_v2_4_seen'

export function WhatsNewModal() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Verifica se o usuário já viu o popout da versão atual
    const hasSeen = localStorage.getItem(STORAGE_KEY)
    if (!hasSeen) {
      // Delay suave de 600ms para carregar após renderização da interface
      const timer = setTimeout(() => {
        setOpen(true)
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [])

  // Permite abrir via evento customizado a qualquer momento (ex: clicando em "Ver Novidades")
  useEffect(() => {
    const handleOpenEvent = () => setOpen(true)
    window.addEventListener('open-whats-new-modal', handleOpenEvent)
    return () => window.removeEventListener('open-whats-new-modal', handleOpenEvent)
  }, [])

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setOpen(false)
  }

  if (!mounted) return null

  const newFeatures = [
    {
      icon: Activity,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      title: 'Meta Health Score & Auditoria de Conta (0 a 100)',
      description:
        'Auditoria instantânea de 5 pilares com pontuação de saúde, detector de Aprendizado Limitado (Learning Limited), ralo de orçamento e checklist anti-desperdício.',
    },
    {
      icon: Clock,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      title: 'Mapa de Calor dos Melhores Horários (Dayparting 7x24)',
      description:
        'Tabela visual interativa de 7 dias × 24 horas revelando com precisão matemática em quais horários suas conversões acontecem e onde o Meta queima verba sem retorno.',
    },
    {
      icon: Film,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      title: 'Reprodutor de Criativos em Vídeo & Zoom HD',
      description:
        'Player de vídeo nativo integrado para reproduzir seus anúncios em alta definição sem compressão, com análise avançada de fadiga e frequência.',
    },
    {
      icon: ShieldAlert,
      color: 'text-red-400 bg-red-500/10 border-red-500/20',
      title: 'Guardião AdPilot (Stop-Loss Automático)',
      description:
        'Blindagem financeira configurável para pausar anúncios fadigados ou disparos de CPA automaticamente antes que consumam seu orçamento.',
    },
    {
      icon: Brain,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      title: 'AI Advisor 2.0 (Análise em Tempo Real)',
      description:
        'Botão de análise instantânea conectado diretamente às suas campanhas operacionais reais, com recomendações estratégicas e diagnóstico do algoritmo Meta.',
    },
    {
      icon: Layers,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      title: 'Alternador Rápido de Contas no Topo',
      description:
        'Troque entre suas contas de anúncios com 1 clique direto pelo cabeçalho superior de qualquer página, com sincronização automática e persistência na nuvem.',
    },
  ]

  return (
    <Dialog open={open} onOpenChange={(val) => (!val ? handleClose() : setOpen(true))}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 border-primary/30 shadow-2xl bg-gradient-to-b from-card via-card to-background">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1.5 py-1 px-2.5">
              <Sparkles className="h-3.5 w-3.5" />
              Versão 2.4 — Grandes Novidades
            </Badge>
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
            O AdPilot AI Ficou Ainda Mais Poderoso! 🚀
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Atualizamos o sistema com novas ferramentas de inteligência operacional para multiplicar o ROAS e proteger o orçamento das suas campanhas.
          </DialogDescription>
        </DialogHeader>

        {/* Lista de Novas Funcionalidades */}
        <div className="space-y-3 my-4">
          {newFeatures.map((feat, idx) => {
            const Icon = feat.icon
            return (
              <div
                key={idx}
                className="flex items-start gap-3.5 p-3.5 rounded-xl border bg-card/60 hover:bg-muted/40 transition-colors"
              >
                <div className={`p-2.5 rounded-lg border shrink-0 ${feat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    {feat.title}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feat.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t">
          <Button variant="outline" asChild onClick={handleClose} className="w-full sm:w-auto text-xs cursor-pointer">
            <Link href="/dashboard/changelog">
              Ver Changelog Completo
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          </Button>
          <Button onClick={handleClose} className="w-full sm:w-auto text-xs font-semibold shadow-md shadow-primary/20 cursor-pointer">
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Entendi, Explorar o Painel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
