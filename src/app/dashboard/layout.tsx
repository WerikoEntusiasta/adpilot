'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard,
  Megaphone,
  Brain,
  CalendarPlus,
  Settings,
  Menu,
  X,
  Rocket,
  LogOut,
  LifeBuoy
, HelpCircle} from 'lucide-react'
import { useAuth } from '@/lib/auth-store'
import { useSettings } from '@/lib/store'

const navItems = [
  { href: '/dashboard', label: 'VisÃ£o Geral', icon: LayoutDashboard },
  { href: '/dashboard/campaigns', label: 'Campanhas', icon: Megaphone },
  { href: '/dashboard/advisor', label: 'IA Advisor', icon: Brain },
  { href: '/dashboard/planner', label: 'Planejador', icon: CalendarPlus },
  { href: '/dashboard/meta-support', label: 'Ajuda & Docs Meta', icon: HelpCircle },
  { href: '/dashboard/support', label: 'Suporte', icon: LifeBuoy },
  { href: '/dashboard/settings', label: 'ConfiguraÃ§Ãµes', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  const settings = useSettings()

  useEffect(() => {
    setMounted(true)
    if (mounted) {
      if (!auth.isAuthenticated) {
        router.push('/')
      } else if (auth.user?.role === 'ADMIN') {
        router.push('/admin')
      } else {
        // Sync public env variables (like if AI is configured)
        fetch('/api/app-config')
          .then(r => r.json())
          .then(data => {
            if (data.envAiConfigured !== undefined) {
              settings.setAiConfig({ envAiConfigured: data.envAiConfigured })
            }
          })
          .catch(console.error)

        // Sync individual user settings (like Facebook token set by Admin)
        if (auth.user?.id) {
          fetch('/api/user/settings', {
            headers: { 'X-User-Id': auth.user.id }
          })
            .then(r => r.json())
            .then(data => {
              if (data.settings) {
                // If the DB has fb keys, sync them to the local store
                if (data.settings.fbAccessToken && data.settings.fbAccessToken !== settings.fbAccessToken) {
                  settings.setFbKeys({ fbAccessToken: data.settings.fbAccessToken })
                }
                if (data.settings.fbAdAccountId && data.settings.fbAdAccountId !== settings.fbAdAccountId) {
                  settings.setFbKeys({ fbAdAccountId: data.settings.fbAdAccountId })
                }
              }
            })
            .catch(console.error)
        }
      }
    }
  }, [mounted, auth.isAuthenticated, auth.user, router, settings])

  const handleLogout = () => {
    auth.logout()
    router.push('/')
  }

  const userName = mounted && auth.user ? auth.user.name : 'UsuÃ¡rio'
  const userInitial = userName.charAt(0).toUpperCase()

  if (!mounted || auth.user?.role === 'ADMIN') return null

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground border-r transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 px-6 py-5">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shadow-md">
              <Rocket className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">AdPilot AI</span>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <Separator />

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/dashboard' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Footer User & Logout */}
          <div className="px-3 py-4 space-y-2">
            {mounted && auth.user && (
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50 border text-xs">
                <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary shrink-0">
                  {userInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{auth.user.name}</p>
                  <p className="text-muted-foreground truncate">{auth.user.email}</p>
                </div>
              </div>
            )}
            <Separator className="mb-2" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sair da Conta
            </button>
          </div>
        </div>
      </aside>

        {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
              {userInitial}
            </div>
            <span className="text-sm font-medium hidden sm:inline">{userName}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 relative">
          {auth.user?.lgpdConsent === false && (
            <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-card border shadow-2xl rounded-xl p-6 max-w-2xl w-full">
                <h2 className="text-xl font-bold mb-4">Termos de Uso e Responsabilidade</h2>
                <div className="bg-muted/50 p-4 rounded-lg border text-sm text-muted-foreground h-64 overflow-y-auto mb-6">
                  <strong className="block mb-2 text-foreground">LimitaÃ§Ãµes de Responsabilidade e Avisos Importantes (Disclaimer)</strong>
                  <p className="mb-2">Para garantir a transparÃªncia no uso da plataforma, destacamos que o AdPilot Ã© uma ferramenta de software as a service (SaaS) "as is" (no estado em que se encontra) e nÃ£o atua como agÃªncia de marketing ou consultor financeiro.</p>
                  <ul className="list-disc pl-4 space-y-2">
                    <li><strong>Os Resultados NÃ£o SÃ£o Garantidos:</strong> A performance de campanhas de trÃ¡fego pago depende de inÃºmeras variÃ¡veis de mercado externas. O AdPilot nÃ£o garante conversÃµes, alcance mÃ­nimo, faturamento (ROAS) ou qualquer tipo de retorno financeiro (ROI).</li>
                    <li><strong>RevisÃ£o Humana ObrigatÃ³ria:</strong> A inteligÃªncia artificial pode gerar informaÃ§Ãµes imprecisas. Ã‰ responsabilidade Ãºnica e exclusiva do usuÃ¡rio final (gestor) revisar minuciosamente orÃ§amentos, pÃºblicos e textos antes de aprovar e veicular qualquer anÃºncio gastando dinheiro real.</li>
                    <li><strong>IntegraÃ§Ã£o de Terceiros (APIs):</strong> MudanÃ§as, bugs ou revogaÃ§Ãµes de tokens do Meta/Facebook, OpenAI e Stripe estÃ£o fora do nosso controle e eximem o sistema de responsabilidades por interrupÃ§Ãµes temporÃ¡rias de serviÃ§o.</li>
                    <li><strong>AlocaÃ§Ã£o de OrÃ§amento:</strong> O usuÃ¡rio Ã© o Ãºnico responsÃ¡vel pelos orÃ§amentos financeiros vinculados ao seu CartÃ£o de CrÃ©dito/Conta de AnÃºncios.</li>
                  </ul>
                  <p className="mt-4">A plataforma AdPilot Ã© um facilitador de processos (ferramenta-meio), nÃ£o uma garantidora de lucros (ferramenta-fim).</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <p className="text-xs text-muted-foreground max-w-xs">VocÃª deve aceitar os termos para continuar utilizando a plataforma.</p>
                  <Button 
                    onClick={async () => {
                      const res = await fetch('/api/user/lgpd/accept', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: auth.user!.id })
                      });
                      if (res.ok) {
                        auth.setAuth({ ...auth.user!, lgpdConsent: true }, auth.token!);
                      }
                    }}
                    className="w-full sm:w-auto bg-primary text-white"
                  >
                    Eu li e Concordo
                  </Button>
                </div>
              </div>
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  )
}
