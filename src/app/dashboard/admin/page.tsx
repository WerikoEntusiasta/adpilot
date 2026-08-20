'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ShieldCheck, Users, CreditCard, Activity, Server, Zap, Search, UserCheck, UserX, Trash2, CheckCircle2, RefreshCw, AlertCircle, DollarSign, Settings, Lock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface UserRecord {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'USER'
  subscriptionStatus: 'ACTIVE_PRO' | 'FREE_DEMO'
  mrr: number
  joinedAt: string
  lastActive: string
}

const mockUsersList: UserRecord[] = [
  { id: 'usr_1', name: 'Werik Oliveira', email: 'werik@adpilot.ai', role: 'ADMIN', subscriptionStatus: 'ACTIVE_PRO', mrr: 250, joinedAt: '2026-08-01', lastActive: 'Hoje às 14:30' },
  { id: 'usr_2', name: 'Carlos Eduardo', email: 'carlos@empresa.com.br', role: 'USER', subscriptionStatus: 'ACTIVE_PRO', mrr: 250, joinedAt: '2026-08-05', lastActive: 'Hoje às 12:15' },
  { id: 'usr_3', name: 'Fernanda Lima', email: 'fernanda@digitalmkt.com', role: 'USER', subscriptionStatus: 'ACTIVE_PRO', mrr: 250, joinedAt: '2026-08-10', lastActive: 'Ontem às 19:40' },
  { id: 'usr_4', name: 'Marcelo Santos', email: 'marcelo@agencia.com', role: 'USER', subscriptionStatus: 'FREE_DEMO', mrr: 0, joinedAt: '2026-08-12', lastActive: 'Há 2 dias' },
  { id: 'usr_5', name: 'Juliana Costa', email: 'juliana@ecommerce.com.br', role: 'USER', subscriptionStatus: 'ACTIVE_PRO', mrr: 250, joinedAt: '2026-08-15', lastActive: 'Hoje às 09:10' },
  { id: 'usr_6', name: 'Roberto Alves', email: 'roberto@trafego.io', role: 'USER', subscriptionStatus: 'FREE_DEMO', mrr: 0, joinedAt: '2026-08-18', lastActive: 'Há 3 dias' },
]

export default function AdminPage() {
  const [users, setUsers] = useState<UserRecord[]>(mockUsersList)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<'ALL' | 'ADMIN' | 'USER'>('ALL')
  const [filterPlan, setFilterPlan] = useState<'ALL' | 'PRO' | 'FREE'>('ALL')

  // Global settings state
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [globalPrice, setGlobalPrice] = useState(250)
  const [defaultModel, setDefaultModel] = useState('opencode-zen')
  const [savedSettings, setSavedSettings] = useState(false)

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === 'ALL' || u.role === filterRole
    const matchesPlan = filterPlan === 'ALL' || (filterPlan === 'PRO' ? u.subscriptionStatus === 'ACTIVE_PRO' : u.subscriptionStatus === 'FREE_DEMO')
    return matchesSearch && matchesRole && matchesPlan
  })

  // Calculate metrics
  const totalUsersCount = users.length
  const activeProCount = users.filter(u => u.subscriptionStatus === 'ACTIVE_PRO').length
  const totalMrr = activeProCount * 250

  const toggleSubscription = (userId: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const nextStatus = u.subscriptionStatus === 'ACTIVE_PRO' ? 'FREE_DEMO' : 'ACTIVE_PRO'
        return { ...u, subscriptionStatus: nextStatus, mrr: nextStatus === 'ACTIVE_PRO' ? 250 : 0 }
      }
      return u
    }))
  }

  const toggleRole = (userId: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, role: u.role === 'ADMIN' ? 'USER' : 'ADMIN' }
      }
      return u
    }))
  }

  const deleteUser = (userId: string) => {
    if (confirm('Tem certeza que deseja remover este usuário?')) {
      setUsers(prev => prev.filter(u => u.id !== userId))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            Painel de Administração (Admin)
          </h1>
          <p className="text-muted-foreground mt-1">Gestão de Usuários, Faturamento Stripe, Métricas de Servidor e IA</p>
        </div>
        <Badge variant="outline" className="w-fit text-sm px-3 py-1 gap-1.5 border-primary/40 bg-primary/5">
          <Lock className="h-3.5 w-3.5 text-primary" /> Acesso Super Admin
        </Badge>
      </div>

      {/* KPI Cards Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Faturamento Mensal (MRR)</p>
                <p className="text-2xl font-bold">{formatCurrency(totalMrr)}</p>
                <p className="text-xs text-emerald-400 mt-1">↑ 18% em relação ao mês anterior</p>
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
                <p className="text-sm font-medium text-muted-foreground">Assinantes Ativos Pro</p>
                <p className="text-2xl font-bold">{activeProCount} <span className="text-sm font-normal text-muted-foreground">/ {totalUsersCount}</span></p>
                <p className="text-xs text-muted-foreground mt-1">R$ 250,00/mês por usuário</p>
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
                <p className="text-sm font-medium text-muted-foreground">Status OpenCode IA</p>
                <p className="text-2xl font-bold text-emerald-400">100% Online</p>
                <p className="text-xs text-muted-foreground mt-1">Latência média: 38ms</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Server className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Meta API Token Health</p>
                <p className="text-2xl font-bold text-emerald-400">Saudável</p>
                <p className="text-xs text-muted-foreground mt-1">v21.0 Graph API operacional</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Activity className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Management Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Gerenciamento de Usuários do SaaS
              </CardTitle>
              <CardDescription className="mt-1">
                Visualização, controle de acesso e alteração de planos dos clientes
              </CardDescription>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Usuário</th>
                  <th className="pb-3 pr-4 font-medium">Função</th>
                  <th className="pb-3 pr-4 font-medium">Plano Stripe</th>
                  <th className="pb-3 pr-4 font-medium">MRR Gerado</th>
                  <th className="pb-3 pr-4 font-medium">Cadastro</th>
                  <th className="pb-3 pr-4 font-medium">Último Acesso</th>
                  <th className="pb-3 font-medium text-right">Ações de Admin</th>
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
                    <td className="py-3 pr-4 font-mono font-bold">
                      {formatCurrency(u.mrr)}
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{u.joinedAt}</td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{u.lastActive}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSubscription(u.id)}
                          title="Alternar Plano Pro / Demo"
                          className="h-8 text-xs"
                        >
                          <CreditCard className="h-3.5 w-3.5 mr-1" />
                          {u.subscriptionStatus === 'ACTIVE_PRO' ? 'Rebaixar' : 'Ativar Pro'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRole(u.id)}
                          title="Alternar Função Admin"
                          className="h-8 text-xs"
                        >
                          <UserCheck className="h-3.5 w-3.5 mr-1" />
                          {u.role === 'ADMIN' ? 'Tirar Admin' : 'Dar Admin'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteUser(u.id)}
                          title="Excluir Usuário"
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
        </CardContent>
      </Card>

      {/* Global SaaS System Settings & Maintenance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Configurações Globais da Plataforma
          </CardTitle>
          <CardDescription>
            Defina parâmetros globais de manutenção, precificação e modelo de IA padrão
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2 p-4 rounded-lg bg-muted/50 border">
              <Label className="font-semibold">Valor Global da Assinatura Pro</Label>
              <Input
                type="number"
                value={globalPrice}
                onChange={e => setGlobalPrice(Number(e.target.value))}
                placeholder="250"
              />
              <p className="text-xs text-muted-foreground">Valor cobrado mensalmente via Stripe Checkout (BRL).</p>
            </div>

            <div className="space-y-2 p-4 rounded-lg bg-muted/50 border">
              <Label className="font-semibold">Modelo de IA Padrão (OpenCode)</Label>
              <Input
                value={defaultModel}
                onChange={e => setDefaultModel(e.target.value)}
                placeholder="opencode-zen"
              />
              <p className="text-xs text-muted-foreground">Modelo pré-selecionado para novos usuários do sistema.</p>
            </div>

            <div className="space-y-2 p-4 rounded-lg bg-muted/50 border flex flex-col justify-between">
              <div>
                <Label className="font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-400" />
                  Modo Manutenção
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Bloqueia temporariamente novos cadastros para atualizações do sistema.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
                <span className="text-xs font-semibold">{maintenanceMode ? 'ATIVADO' : 'DESATIVADO'}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={() => { setSavedSettings(true); setTimeout(() => setSavedSettings(false), 2000) }}>
              {savedSettings ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Alterações Salvas!</> : 'Salvar Configurações Globais'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
