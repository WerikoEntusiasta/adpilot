'use client'

import { ShieldCheck, LogOut, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-store'
import { useRouter } from 'next/navigation'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { logout, user } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar - Admin Only */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r flex flex-col h-screen fixed">
        <div className="flex items-center gap-2 px-6 py-5 border-b">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shadow-md">
            <ShieldCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">AdPilot Admin</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <Button variant="secondary" className="w-full justify-start font-semibold">
            <Settings className="h-5 w-5 mr-3" />
            Configurações e Usuários
          </Button>
          {/* Add more admin links here in the future if needed */}
        </nav>

        <div className="p-4 border-t">
           <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50 border text-xs mb-4">
              <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary shrink-0">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{user?.name || 'Administrador'}</p>
                <p className="text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
          <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-red-400 hover:text-red-500 hover:bg-red-500/10">
            <LogOut className="h-5 w-5 mr-3" />
            Sair do Painel
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 min-w-0 p-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
