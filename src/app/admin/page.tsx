'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ShieldCheck, Users, CreditCard, Activity, Server, Zap, Search, UserCheck, Trash2, CheckCircle2, RefreshCw, AlertCircle, DollarSign, Settings, Lock, KeyRound, Loader2, BrainCircuit } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface UserRecord {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'USER' | string
  subscriptionStatus: 'ACTIVE_PRO' | 'FREE_DEMO' | string
  createdAt: string
  updatedAt: string
}

export default function AdminPage() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [adminEmailInput, setAdminEmailInput] = useState('admin@adpilot.ai')
  const [adminPasswordInput, setAdminPasswordInput] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  // Real data state
  const [users, setUsers] = useState<UserRecord[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [mrr, setMrr] = useState(0)
  const [activeProCount, setActiveProCount] = useState(0)
  const [totalUsersCount, setTotalUsersCount] = useState(0)

  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<'ALL' | 'ADMIN' | 'USER'>('ALL')
  const [filterPlan, setFilterPlan] = useState<'ALL' | 'PRO' | 'FREE'>('ALL')

  // Global settings state
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [globalPrice, setGlobalPrice] = useState(250)
  const [aiEndpoint, setAiEndpoint] = useState('https://api.openai.com/v1')
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiModel, setAiModel] = useState('opencode-zen')
  const [savedSettings, setSavedSettings] = useState(false)

  // Fetch real data from SQLite
  const fetchRealData = async () => {
    setIsLoadingUsers(true)
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (res.ok && data.users) {
        setUsers(data.users)
        setTotalUsersCount(data.metrics.totalUsers)
        setActiveProCount(data.metrics.activePro)
        setMrr(data.metrics.totalMrr)
      }
      
      const settingsRes = await fetch('/api/admin/settings')
      const settingsData = await settingsRes.json()
      if (settingsRes.ok && settingsData.settings) {
        setMaintenanceMode(settingsData.settings.maintenanceMode)
        setGlobalPrice(settingsData.settings.globalPrice)
        setAiEndpoint(settingsData.settings.aiEndpoint || 'https://api.openai.com/v1')
        setAiApiKey(settingsData.settings.aiApiKey || '')
        setAiModel(settingsData.settings.aiModel || 'opencode-zen')
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err)
    }
    setIsLoadingUsers(false)
  }

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchRealData()
    }
  }, [isAdminAuthenticated])

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAuthenticating(true)
    setAuthError(null)

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEmailInput,
          password: adminPasswordInput,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setIsAdminAuthenticated(true)
      } else {
        setAuthError(data.error || 'Credenciais de Admin incorretas.')
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Erro de conexão')
    }
    setIsAuthenticating(false)
  }

  const saveGlobalSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maintenanceMode,
          globalPrice,
          aiEndpoint,
          aiApiKey,
          aiModel
        }),
      })
      if (res.ok) {
        setSavedSettings(true)
        setTimeout(() => setSavedSettings(false), 2000)
      }
    } catch (err) {
      console.error('Erro ao salvar settings:', err)
    }
  }

  // Toggle user subscription status in SQLite
  const toggleSubscription = async (user: UserRecord) => {
    const nextStatus = user.subscriptionStatus === 'ACTIVE_PRO' ? 'FREE_DEMO' : 'ACTIVE_PRO'
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionStatus: nextStatus }),
      })
      if (res.ok) fetchRealData()
    } catch (err) {
      console.error('Erro ao atualizar plano no SQLite:', err)
    }
  }

  // Toggle user role in SQLite
  const toggleRole = async (user: UserRecord) => {
    const nextRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN'
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      })
      if (res.ok) fetchRealData()
    } catch (err) {
      console.error('Erro ao atualizar função no SQLite:', err)
    }
  }

  // Delete user in SQLite
  const deleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja remover este usuário do banco de dados SQLite?')) return
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })
      if (res.ok) fetchRealData()
    } catch (err) {
      console.error('Erro ao deletar no SQLite:', err)
    }
  }

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === 'ALL' || u.role === filterRole
    const matchesPlan = filterPlan === 'ALL' || (filterPlan === 'PRO' ? u.subscriptionStatus === 'ACTIVE_PRO' : u.subscriptionStatus === 'FREE_DEMO')
    return matchesSearch && matchesRole && matchesPlan
  })

  // Render Login Modal if not authenticated
  if (!isAdminAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-12 mt-20">
        <Card className="border-primary/40 shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary mb-2">
              <Lock className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">Acesso Restrito ao Admin</CardTitle>
            <CardDescription>
              Insira as credenciais de Administrador definidas nas variáveis de ambiente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminAuth} className="space-y-4">
              {authError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="admin-email">E-mail do Administrador (ADMIN_EMAIL)</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={adminEmailInput}
                  onChange={e => setAdminEmailInput(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-pwd">Senha do Administrador (ADMIN_PASSWORD)</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="admin-pwd"
                    type="password"
                    placeholder="Digite ADMIN_PASSWORD..."
                    value={adminPasswordInput}
                    onChange={e => setAdminPasswordInput(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-10 font-bold gap-2" disabled={isAuthenticating}>
                {isAuthenticating ? <><Loader2 className="h-4 w-4 animate-spin" /> Autenticando...</> : <><ShieldCheck className="h-4 w-4" /> Entrar no Painel Admin</>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Dashboard Administrativo
          </h1>
          <p className="text-muted-foreground mt-1">Conectado ao banco de dados SQLite e sincronizado globalmente.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchRealData} disabled={isLoadingUsers}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingUsers ? 'animate-spin' : ''}`} />
            Atualizar Dados
          </Button>
          <Badge variant="success" className="text-xs px-3 py-1 gap-1.5 shadow-sm font-bold">
            <Lock className="h-3.5 w-3.5" /> Admin Autenticado
          </Badge>
        </div>
      </div>

      {/* KPI Cards Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Faturamento MRR Real</p>
                <p className="text-2xl font-bold">{formatCurrency(mrr)}</p>
                <p className="text-xs text-emerald-400 mt-1">Calculado sobre assinantes Pro no SQLite</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Assinantes Pro no SQLite</p>
                <p className="text-2xl font-bold">{activeProCount} <span className="text-sm font-normal text-muted-foreground">/ {totalUsersCount}</span></p>
                <p className="text-xs text-muted-foreground mt-1">Baseado no plano atual</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <CreditCard className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status Global da IA</p>
                <p className="text-2xl font-bold text-emerald-400">Configurada</p>
                <p className="text-xs text-muted-foreground mt-1">Modelo: {aiModel}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                <BrainCircuit className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Global AI Config */}
      <Card className="border-purple-500/30 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-purple-500" />
            Configuração Global da Inteligência Artificial
          </CardTitle>
          <CardDescription>
            Estas configurações afetam TODOS os usuários da plataforma. As credenciais ficam ocultas dos usuários.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="font-semibold">Endpoint Base da API de IA</Label>
              <Input
                value={aiEndpoint}
                onChange={e => setAiEndpoint(e.target.value)}
                placeholder="https://api.openai.com/v1"
              />
              <p className="text-xs text-muted-foreground">URL base do serviço (ex: OpenAI, OpenCode, Llama).</p>
            </div>
            
            <div className="space-y-2">
              <Label className="font-semibold">Modelo de IA (ex: opencode-zen, gpt-4o)</Label>
              <Input
                value={aiModel}
                onChange={e => setAiModel(e.target.value)}
                placeholder="opencode-zen"
              />
              <p className="text-xs text-muted-foreground">Modelo que será utilizado para geração de copys e campanhas.</p>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label className="font-semibold">Chave de API (Secret Key)</Label>
              <Input
                type="password"
                value={aiApiKey}
                onChange={e => setAiApiKey(e.target.value)}
                placeholder="sk-..."
              />
              <p className="text-xs text-muted-foreground">Chave de autenticação da IA.</p>
            </div>
          </div>
          
          <div className="flex justify-end pt-2">
            <Button onClick={saveGlobalSettings}>
              {savedSettings ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Salvo!</> : 'Salvar Configuração de IA'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Global SaaS System Settings & Maintenance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Configurações Globais da Plataforma
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2 p-4 rounded-lg bg-muted/50 border">
              <Label className="font-semibold">Valor Global da Assinatura Pro (R$)</Label>
              <Input
                type="number"
                value={globalPrice}
                onChange={e => setGlobalPrice(Number(e.target.value))}
                placeholder="250"
              />
            </div>

            <div className="space-y-2 p-4 rounded-lg bg-muted/50 border flex flex-col justify-between">
              <div>
                <Label className="font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-400" />
                  Modo Manutenção
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Bloqueia novos cadastros temporariamente.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
                <span className="text-xs font-semibold">{maintenanceMode ? 'ATIVADO' : 'DESATIVADO'}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={saveGlobalSettings}>
              {savedSettings ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Salvo!</> : 'Salvar Configurações Globais'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Management Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Gerenciamento de Usuários
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou e-mail..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 w-64 h-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="py-12 text-center text-muted-foreground flex justify-center items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" /> Carregando usuários do SQLite...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Usuário</th>
                    <th className="pb-3 pr-4 font-medium">Função</th>
                    <th className="pb-3 pr-4 font-medium">Plano Stripe</th>
                    <th className="pb-3 pr-4 font-medium">Data Cadastro</th>
                    <th className="pb-3 font-medium text-right">Ações no SQLite</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-3 pr-4 font-medium">
                        <div>
                          <p className="font-semibold text-foreground">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        {u.role === 'ADMIN' ? (
                          <Badge variant="default" className="bg-purple-600 gap-1"><ShieldCheck className="h-3 w-3" /> Admin</Badge>
                        ) : (
                          <Badge variant="outline">Cliente</Badge>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {u.subscriptionStatus === 'ACTIVE_PRO' ? (
                          <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Pro (R$ 250/mês)</Badge>
                        ) : (
                          <Badge variant="secondary">Demo Grátis</Badge>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSubscription(u)}
                            title="Alternar Plano Pro no SQLite"
                            className="h-8 text-xs"
                          >
                            <CreditCard className="h-3.5 w-3.5 mr-1" />
                            {u.subscriptionStatus === 'ACTIVE_PRO' ? 'Rebaixar' : 'Ativar Pro'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRole(u)}
                            title="Alternar Função no SQLite"
                            className="h-8 text-xs"
                          >
                            <UserCheck className="h-3.5 w-3.5 mr-1" />
                            {u.role === 'ADMIN' ? 'Tirar Admin' : 'Dar Admin'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteUser(u.id)}
                            title="Excluir Usuário do SQLite"
                            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
