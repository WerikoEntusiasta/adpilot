'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  Clock,
  Film,
  ShieldAlert,
  Brain,
  Layers,
  Shield,
  HelpCircle,
  TrendingUp,
  Eye,
  CheckCircle2,
  Calendar,
  Zap,
} from 'lucide-react'

export default function ChangelogPage() {
  const handleOpenWhatsNew = () => {
    window.dispatchEvent(new Event('open-whats-new-modal'))
  }

  const releases = [
    {
      version: 'v2.4.0',
      date: 'Setembro 2026',
      badge: 'Versão Mais Recente',
      title: 'Reprodutor de Vídeos, Dayparting 7x24 e Seletor Global de Contas',
      description:
        'Uma atualização focada em inteligência operacional, reprodução multimídia de criativos e flexibilidade multi-conta.',
      changes: [
        {
          type: 'NOVO',
          icon: Film,
          title: 'Reprodutor de Criativos em Vídeo Integrado',
          description:
            'Agora você pode reproduzir anúncios em formato de vídeo diretamente na Galeria de Criativos, com player HTML5 de alta definição, controles de reprodução e inspeção de cópia sem compressão.',
        },
        {
          type: 'NOVO',
          icon: Clock,
          title: 'Mapa de Calor dos Melhores Horários (Dayparting & Hourly Heatmap)',
          description:
            'Matriz de 7 dias × 24 horas que cruza investimento e conversões para indicar visualmente onde estão seus horários de maior lucro e alertar sobre queima de verba noturna.',
        },
        {
          type: 'NOVO',
          icon: Layers,
          title: 'Seletor Global de Contas de Anúncios no Topo',
          description:
            'Alterne rapidamente entre múltiplas contas do Meta Ads direto pelo topo de qualquer página do painel, com sincronização em tempo real e persistência imediata.',
        },
        {
          type: 'MELHORIA',
          icon: Brain,
          title: 'AI Advisor 2.0 com Análise sob Demanda',
          description:
            'O botão "Analisar Minhas Campanhas Agora" foi aprimorado para conectar em milissegundos aos modelos de alta velocidade (Gemini 3.8 Flash / 9Router), gerando planos de ação imediatos para suas campanhas reais.',
        },
        {
          type: 'CORREÇÃO',
          icon: Shield,
          title: 'Isolamento Estrito de Campanhas Arquivadas',
          description:
            'Campanhas com status ARCHIVED ou DELETED foram completamente blindadas de todos os relatórios, consolidações de ROAS e prompts de IA, garantindo métricas 100% puras da conta ativa.',
        },
      ],
    },
    {
      version: 'v2.3.0',
      date: 'Setembro 2026',
      badge: 'Estabilidade',
      title: 'Guardião AdPilot (Stop-Loss Automático) & Leaderboard de Criativos',
      description:
        'Módulo de proteção contra sangria de orçamento e ranking preditivo de saturação de criativos.',
      changes: [
        {
          type: 'NOVO',
          icon: ShieldAlert,
          title: 'Guardião AdPilot (Regras Stop-Loss Inteligentes)',
          description:
            'Monitoramento 24/7 com regras desativadas por padrão (para controle do usuário) para travar sangria de verba quando o CPA explodir ou o criativo saturar.',
        },
        {
          type: 'NOVO',
          icon: Eye,
          title: 'Detecção de Fadiga & Zoom em Alta Definição',
          description:
            'Cálculo algorítmico de frequência e CTR para antecipar saturação de audiência antes do gestor sofrer prejuízo.',
        },
        {
          type: 'MELHORIA',
          icon: TrendingUp,
          title: 'Filtro Dinâmico por Objetivos de Campanha',
          description:
            'Visualização organizada por Vendas (Site), Mensagens (WhatsApp/Direct) e Reconhecimento, com métricas específicas para cada funil.',
        },
      ],
    },
    {
      version: 'v2.2.0',
      date: 'Agosto 2026',
      badge: 'Conformidade',
      title: 'Conformidade LGPD, Central de Ajuda & Gateway 9Router',
      description:
        'Adequação regulatória de privacidade e suporte integrado de IA para os usuários da plataforma.',
      changes: [
        {
          type: 'NOVO',
          icon: Shield,
          title: 'Painel de Privacidade & LGPD (Art. 18)',
          description:
            'Termos de responsabilidade na entrada, ferramenta de download de dados em JSON e opção de exclusão definitiva de conta.',
        },
        {
          type: 'NOVO',
          icon: HelpCircle,
          title: 'Central de Ajuda Meta Ads Oficial',
          description:
            'Agente especializado em políticas de anúncio, causas de rejeição e boas práticas dos algoritmos Meta.',
        },
        {
          type: 'MELHORIA',
          icon: Zap,
          title: 'Integração Nativa com Gateway 9Router',
          description:
            'Conexão ultraveloz para geração de sugestões de tráfego pago sem necessidade de chave de API pessoal por parte do usuário final.',
        },
      ],
    },
  ]

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1 text-xs">
              <Sparkles className="h-3 w-3" />
              Histórico de Atualizações
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mt-1">O Que Há de Novo</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Fique por dentro de todas as novidades, melhorias e recursos implementados no AdPilot AI.
          </p>
        </div>

        <Button
          onClick={handleOpenWhatsNew}
          variant="outline"
          className="gap-2 text-xs shadow-xs self-start sm:self-center cursor-pointer"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Rever Apresentação das Novidades
        </Button>
      </div>

      {/* Timeline de Versões */}
      <div className="space-y-8">
        {releases.map((release) => (
          <div key={release.version} className="relative pl-6 sm:pl-8 border-l-2 border-primary/20 space-y-4">
            {/* Marcador na Timeline */}
            <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-primary ring-4 ring-background" />

            {/* Cabeçalho da Versão */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xl font-bold text-foreground font-mono">{release.version}</span>
                <Badge variant="outline" className="text-xs font-semibold bg-primary/10 text-primary border-primary/30">
                  {release.badge}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {release.date}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-foreground">{release.title}</h2>
              <p className="text-sm text-muted-foreground">{release.description}</p>
            </div>

            {/* Cards de Mudanças */}
            <div className="grid gap-3">
              {release.changes.map((item, idx) => {
                const Icon = item.icon
                return (
                  <Card key={idx} className="border-border/60 bg-card/70 hover:bg-card transition-colors">
                    <CardContent className="p-4 flex items-start gap-3.5">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{item.title}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              item.type === 'NOVO'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : item.type === 'MELHORIA'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {item.type}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
