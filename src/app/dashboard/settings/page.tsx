'use client'

import { useEffect, useState, Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Settings, Key, Eye, EyeOff, CheckCircle2, XCircle, Loader2, Shield, Brain, AlertTriangle, RefreshCw, Layers, Sparkles, Server, CreditCard, Zap, Check } from 'lucide-react'
import { useSettings } from '@/lib/store'
import { useSearchParams } from 'next/navigation'

interface AdAccountItem {
  id: string
  accountId: string
  name: string
  currency: string
}

interface AiModelItem {
  id: string
  name: string
}

function SettingsContent() {
  const settings = useSettings()
  const searchParams = useSearchParams()

  const [showTokens, setShowTokens] = useState(false)
  const [isValidatingFb, setIsValidatingFb] = useState(false)
  const [fbErrorDetails, setFbErrorDetails] = useState<string | null>(null)
  const [accountName, setAccountName] = useState<string | null>(null)

  // Ad accounts list dropdown
  const [adAccounts, setAdAccounts] = useState<AdAccountItem[]>([])
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false)

  // AI OpenCode Models list
  const [aiModels, setAiModels] = useState<AiModelItem[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)

  const [isValidatingAi, setIsValidatingAi] = useState(false)
  const [aiStatus, setAiStatus] = useState<'idle' | 'valid' | 'invalid'>('idle')
  const [aiErrorDetails, setAiErrorDetails] = useState<string | null>(null)

  const [paymentSuccessNotice, setPaymentSuccessNotice] = useState(false)
  const [savedFb, setSavedFb] = useState(false)
  const [savedAi, setSavedAi] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Check URL params for Stripe checkout success
  useEffect(() => {
    if (mounted) {
      if (searchParams.get('payment') === 'success') {
        settings.setProStatus(true)
        setPaymentSuccessNotice(true)
      }
    }
  }, [mounted, searchParams])

  // Fetch list of ad accounts associated with token
  const handleFetchAccounts = async () => {
    if (!settings.fbAccessToken && !settings.useAdminFbToken) return
    setIsLoadingAccounts(true)
    setFbErrorDetails(null)
    try {
      const res = await fetch('/api/facebook/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accessToken: settings.fbAccessToken,
          useAdminToken: settings.useAdminFbToken 
        }),
      })

      const data = await res.json()
      if (res.ok && data.accounts) {
        setAdAccounts(data.accounts)
        if (data.accounts.length > 0 && !settings.fbAdAccountId) {
          settings.setFbKeys({ fbAdAccountId: data.accounts[0].id })
        }
      } else {
        setFbErrorDetails(data.error || 'Não foi possível buscar as contas de anúncios.')
      }
    } catch (err) {
      setFbErrorDetails(err instanceof Error ? err.message : 'Erro ao buscar contas')
    }
    setIsLoadingAccounts(false)
  }

  // Fetch models dynamically from OpenCode / OpenAI endpoint (/v1/models)
  const handleFetchAiModels = async () => {
    if (!settings.aiEndpoint) return
    setIsLoadingModels(true)
    setModelsError(null)
    try {
      const res = await fetch('/api/ai/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: settings.aiEndpoint,
          apiKey: settings.aiApiKey,
        }),
      })

      const data = await res.json()
      if (res.ok && data.models && data.models.length > 0) {
        setAiModels(data.models)
        if (!settings.aiModel || settings.aiModel === 'gpt-4o-mini') {
          settings.setAiConfig({ aiModel: data.models[0].id })
        }
      } else {
        setModelsError(data.error || 'Não foi possível obter a lista de modelos do endpoint.')
      }
    } catch (err) {
      setModelsError(err instanceof Error ? err.message : 'Erro ao listar modelos')
    }
    setIsLoadingModels(false)
  }

  useEffect(() => {
    if (mounted) {
      if (settings.fbAccessToken || settings.useAdminFbToken) handleFetchAccounts()
      if (settings.aiEndpoint) handleFetchAiModels()
    }
  }, [mounted, settings.fbAccessToken, settings.useAdminFbToken, settings.aiEndpoint])

  const handleValidateFb = async () => {
    setIsValidatingFb(true)
    setFbErrorDetails(null)
    setAccountName(null)
    try {
      const res = await fetch('/api/facebook/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: settings.fbAccessToken,
          adAccountId: settings.fbAdAccountId,
          useAdminToken: settings.useAdminFbToken
        }),
      })

      const data = await res.json()
      if (res.ok && data.valid) {
        settings.setFbStatus('valid')
        setAccountName(data.name || 'Conta de Anúncios')
      } else {
        settings.setFbStatus('invalid')
        setFbErrorDetails(data.error || 'Falha na validação com o Facebook Graph API.')
      }
    } catch (err) {
      settings.setFbStatus('invalid')
      setFbErrorDetails(err instanceof Error ? err.message : 'Erro de conexão')
    }
    setIsValidatingFb(false)
  }

  const handleValidateAi = async () => {
    setIsValidatingAi(true)
    setAiErrorDetails(null)
    try {
      const res = await fetch('/api/ai/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: settings.aiEndpoint,
          apiKey: settings.aiApiKey,
          model: settings.aiModel,
        }),
      })
      const data = await res.json()
      if (res.ok && data.valid) {
        setAiStatus('valid')
      } else {
        setAiStatus('invalid')
        setAiErrorDetails(data.error || 'Erro ao validar conexão com a IA.')
      }
    } catch (err) {
      setAiStatus('invalid')
      setAiErrorDetails(err instanceof Error ? err.message : 'Erro de conexão')
    }
    setIsValidatingAi(false)
  }

  if (!mounted) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          Configurações de Integração & Assinatura
        </h1>
        <p className="text-muted-foreground mt-1">Gerencie seu plano Stripe, credenciais do Facebook Ads e OpenCode IA</p>
      </div>

      {/* STRIPE SUBSCRIPTION BADGE */}
      <Card className="border-primary/40 bg-gradient-to-br from-card via-card to-primary/5 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <CreditCard className="h-6 w-6 text-primary" />
                Assinatura AdPilot Pro
              </CardTitle>
              <CardDescription className="mt-1">
                Plano ativo e gerenciado via Stripe Checkout no cadastro
              </CardDescription>
            </div>
            <div>
              <Badge variant="success" className="text-sm px-3.5 py-1 gap-1.5 shadow-md font-bold">
                <CheckCircle2 className="h-4 w-4" /> Plano Pro Ativo (R$ 250,00/mês)
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentSuccessNotice && (
            <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 shrink-0" />
              <div>
                <p className="font-bold text-base">Assinatura Confirmada com Sucesso pelo Stripe! 🎉</p>
                <p className="text-xs text-emerald-300/90">Sua mensalidade de R$ 250,00/mês está ativa com acesso completo à plataforma.</p>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/60 border space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Zap className="h-4 w-4 text-primary" /> Benefícios da Assinatura Pro
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Métricas e Ações em Tempo Real via Facebook API</li>
                <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> IA Advisor Autônoma (OpenCode/GPT) sem limite</li>
                <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Planejador Autônomo com Upload de Criativos</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-muted/60 border flex flex-col justify-between">
              <div className="space-y-1">
                <p className="font-bold text-sm">Valor & Faturamento</p>
                <p className="text-3xl font-extrabold tracking-tight">R$ 250<span className="text-sm font-normal text-muted-foreground">,00 / mês</span></p>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                As variáveis de ambiente do Stripe são carregadas com segurança do servidor e do arquivo de ambiente (Docker env / .env).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Facebook API Keys */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Facebook Marketing API
              </CardTitle>
              <CardDescription className="mt-1">
                Insira o Access Token para listar e selecionar suas Contas de Anúncios
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {settings.fbStatus === 'valid' && <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Conectado</Badge>}
              {settings.fbStatus === 'invalid' && <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Erro de Conexão</Badge>}
              {settings.fbStatus === 'idle' && settings.fbAccessToken && <Badge variant="secondary">Não testado</Badge>}
              {settings.fbStatus === 'idle' && !settings.fbAccessToken && <Badge variant="outline">Não configurado</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowTokens(!showTokens)}>
              {showTokens ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {showTokens ? 'Ocultar Chaves' : 'Mostrar Chaves'}
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4 md:col-span-2">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/40">
                <div className="space-y-0.5">
                  <Label className="text-base">Usar Conexão Oficial da Agência</Label>
                  <p className="text-xs text-muted-foreground">
                    Utiliza o token global configurado pelo administrador. Você só precisará informar o ID da sua Conta de Anúncios.
                  </p>
                </div>
                <Switch 
                  checked={settings.useAdminFbToken} 
                  onCheckedChange={checked => settings.setFbKeys({ useAdminFbToken: checked, fbAccessToken: '' })} 
                />
              </div>

              {!settings.useAdminFbToken && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Seu Access Token Manual (`ads_read` e `ads_management`)</Label>
                  </div>
                  <Input
                    type={showTokens ? 'text' : 'password'}
                    value={settings.fbAccessToken}
                    onChange={e => settings.setFbKeys({ fbAccessToken: e.target.value })}
                    placeholder="EAA..."
                  />
                </div>
              )}

              <div className="flex justify-end">
                {(settings.fbAccessToken || settings.useAdminFbToken) && (
                  <Button variant="outline" size="sm" onClick={handleFetchAccounts} disabled={isLoadingAccounts} className="h-8 text-xs">
                    <RefreshCw className={`h-3 w-3 mr-2 ${isLoadingAccounts ? 'animate-spin' : ''}`} />
                    Listar Minhas Contas de Anúncios
                  </Button>
                )}
              </div>
            </div>

            {/* AD ACCOUNT SELECT MENU */}
            <div className="space-y-2 md:col-span-2">
              <Label className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Selecionar Conta de Anúncios (Ad Account)
              </Label>

              {adAccounts.length > 0 ? (
                <Select
                  value={settings.fbAdAccountId}
                  onValueChange={(val) => settings.setFbKeys({ fbAdAccountId: val })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione uma Conta de Anúncios" />
                  </SelectTrigger>
                  <SelectContent>
                    {adAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({acc.id}) - {acc.currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-2">
                  <Input
                    value={settings.fbAdAccountId}
                    onChange={e => settings.setFbKeys({ fbAdAccountId: e.target.value })}
                    placeholder="Ex: act_1234567890 (Cole o ID ou insira o Access Token acima para listar)"
                  />
                </div>
              )}
            </div>
          </div>

          {accountName && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Conectado com sucesso à conta: <strong>{accountName}</strong></span>
            </div>
          )}

          {fbErrorDetails && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Erro do Facebook:</span>
              </div>
              <p className="font-mono text-xs whitespace-pre-wrap">{fbErrorDetails}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleValidateFb} disabled={isValidatingFb || !settings.fbAccessToken || !settings.fbAdAccountId}>
              {isValidatingFb ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
              {isValidatingFb ? 'Testando Conexão...' : 'Testar Conexão com Facebook'}
            </Button>
            <Button onClick={() => { setSavedFb(true); setTimeout(() => setSavedFb(false), 2000) }} disabled={!settings.fbAccessToken}>
              {savedFb ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Salvo!</> : 'Salvar Seleção'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Privacidade & LGPD */}
      <Card className="border-red-500/20 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-500">
            <Shield className="h-5 w-5" />
            Privacidade & LGPD
          </CardTitle>
          <CardDescription>
            Controle total sobre seus dados pessoais de acordo com a Lei Geral de Proteção de Dados (Art. 18).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3 p-4 rounded-lg bg-muted/30 border">
              <div>
                <p className="font-semibold text-sm">Exportar Dados (Portabilidade)</p>
                <p className="text-xs text-muted-foreground mt-1">Baixe uma cópia de todas as suas configurações, métricas armazenadas e log de uso da IA em formato legível (JSON).</p>
              </div>
              <Button variant="outline" size="sm" onClick={async () => {
                const res = await fetch('/api/user/lgpd/export')
                const data = await res.json()
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'adpilot_meus_dados_lgpd.json'
                a.click()
              }}>
                Baixar Meus Dados
              </Button>
            </div>

            <div className="space-y-3 p-4 rounded-lg bg-red-500/5 border border-red-500/20">
              <div>
                <p className="font-semibold text-sm text-red-500">Excluir Conta Permanentemente</p>
                <p className="text-xs text-muted-foreground mt-1">Sua assinatura será cancelada (Stripe) e todos os seus dados serão apagados definitivamente do nosso banco de dados (SQLite).</p>
              </div>
              <Button variant="destructive" size="sm" onClick={async () => {
                if (confirm('Aviso Irreversível: Tem certeza que deseja apagar sua conta e todos os dados armazenados? Sua assinatura será cancelada.')) {
                  const res = await fetch('/api/user/lgpd/delete', { method: 'POST' })
                  if (res.ok) {
                    alert('Conta excluída com sucesso. Você será desconectado.')
                    window.location.href = '/'
                  }
                }
              }}>
                Excluir Minha Conta
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground text-sm">Carregando configurações...</div>}>
      <SettingsContent />
    </Suspense>
  )
}
