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
} from 'lucide-react'
import { useAuth } from '@/lib/auth-store'

const navItems = [
  { href: '/dashboard', label: 'Visão Geral', icon: LayoutDashboard },
  { href: '/dashboard/campaigns', label: 'Campanhas', icon: Megaphone },
  { href: '/dashboard/advisor', label: 'IA Advisor', icon: Brain },
  { href: '/dashboard/planner', label: 'Planejador', icon: CalendarPlus },
  { href: '/dashboard/settings', label: 'Configurações', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (mounted) {
      if (!auth.isAuthenticated) {
        router.push('/')
      } else if (auth.user?.role === 'ADMIN') {
        router.push('/admin')
      }
    }
  }, [mounted, auth.isAuthenticated, auth.user, router])

  const handleLogout = () => {
    auth.logout()
    router.push('/')
  }

  const userName = mounted && auth.user ? auth.user.name : 'Usuário'
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
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
