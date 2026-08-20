'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Rocket, BarChart3, Brain, Zap, Loader2, AlertCircle, CheckCircle2, Lock, Mail, User, CreditCard, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth-store'
import { useSettings } from '@/lib/store'

export default function AuthPage() {
  const router = useRouter()
  const setAuth = useAuth((s) => s.setAuth)
  const setProStatus = useSettings((s) => s.setProStatus)

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('register')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Login form state
  const [loginEmail, setLoginEmail] = useState('demo@adpilot.ai')
  const [loginPassword, setLoginPassword] = useState('demo123')

  // Register form state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })

      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Erro ao realizar login.')
        setIsLoading(false)
        return
      }

      setAuth(data.user, data.token)
      setSuccessMsg('Login realizado! Entrando...')
      setTimeout(() => {
        router.push('/dashboard')
      }, 500)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro de conexão')
      setIsLoading(false)
    }
  }

  // Registration + Immediate Stripe Checkout Redirect (R$ 250,00/mês)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('As senhas não coincidem.')
      setIsLoading(false)
      return
    }

    try {
      // Step 1: Register account
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPassword }),
      })

      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Erro ao realizar cadastro.')
        setIsLoading(false)
        return
      }

      setAuth(data.user, data.token)
      setSuccessMsg('Conta criada! Redirecionando para o pagamento no Stripe (R$ 250,00/mês)...')

      // Step 2: Trigger Stripe Checkout Session
      const checkoutRes = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: regEmail }),
      })

      const checkoutData = await checkoutRes.json()
      if (checkoutRes.ok && checkoutData.url) {
        // Mark as Pro and redirect to Stripe
        setProStatus(true)
        window.location.href = checkoutData.url
      } else {
        // Fallback if Stripe keys not set in env: grant access and enter dashboard
        setProStatus(true)
        setTimeout(() => router.push('/dashboard?payment=success'), 1000)
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro de conexão')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding & Value Proposition */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/20 via-primary/10 to-background items-center justify-center p-12">
        <div className="max-w-md space-y-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Rocket className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold">AdPilot AI</h1>
          </div>
          <p className="text-xl text-muted-foreground">
            Sua plataforma autônoma de tráfego pago no Facebook Ads com Inteligência Artificial.
          </p>

          <div className="p-6 rounded-2xl bg-card border border-primary/30 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg">Assinatura AdPilot Pro</span>
              <span className="text-2xl font-black text-primary">R$ 250<span className="text-xs text-muted-foreground">,00/mês</span></span>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Checkout seguro via Stripe (Cartão de Crédito)</p>
              <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Conexão em tempo real com Facebook Marketing API</p>
              <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /> IA Advisor autônoma para criar e otimizar campanhas</p>
            </div>
          </div>

          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <BarChart3 className="h-4 w-4" />
              </div>
              <span>Painel de estatísticas modulares por objetivo de campanha</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Brain className="h-4 w-4" />
              </div>
              <span>Suporte a servidores OpenCode e modelos de IA customizados</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Registration with Stripe Checkout */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center lg:hidden space-y-2">
            <div className="inline-flex h-12 w-12 rounded-xl bg-primary items-center justify-center shadow-lg">
              <Rocket className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">AdPilot AI</h1>
          </div>

          <Card className="border shadow-xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl">Cadastro & Assinatura</CardTitle>
              <CardDescription>Crie sua conta e assine o plano Pro (R$ 250,00/mês)</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'login' | 'register'); setErrorMsg(null); setSuccessMsg(null); }}>
                <TabsList className="grid grid-cols-2 w-full mb-6">
                  <TabsTrigger value="register">Criar Conta</TabsTrigger>
                  <TabsTrigger value="login">Já tenho conta</TabsTrigger>
                </TabsList>

                {errorMsg && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* REGISTER TAB (Default for new users) */}
                <TabsContent value="register">
                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-name">Nome Completo</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-name"
                          type="text"
                          placeholder="Seu Nome"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-email">E-mail Comercial</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder="seu@empresa.com"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-password"
                          type="password"
                          placeholder="Mínimo 6 caracteres"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-confirm">Confirmar Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-confirm"
                          type="password"
                          placeholder="Repita sua senha"
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs flex items-center justify-between">
                      <span className="font-semibold text-primary">Assinatura AdPilot Pro:</span>
                      <span className="font-mono font-bold">R$ 250,00 / mês</span>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 font-bold bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 gap-2 shadow-lg"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</>
                      ) : (
                        <><CreditCard className="h-4 w-4" /> Cadastrar e Ir para Pagamento Stripe</>
                      )}
                    </Button>
                  </form>
                </TabsContent>

                {/* LOGIN TAB */}
                <TabsContent value="login">
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">E-mail</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password">Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full h-10 font-semibold" disabled={isLoading}>
                      {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Entrando...</> : 'Entrar no Dashboard'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
