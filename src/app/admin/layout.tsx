import { ShieldCheck, ArrowLeft, LogOut } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navbar specifically for Admin */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <ShieldCheck className="h-6 w-6 text-primary" />
            AdPilot <span className="text-muted-foreground">| Admin</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Visualizar como Usuário
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Link>
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main Admin Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
