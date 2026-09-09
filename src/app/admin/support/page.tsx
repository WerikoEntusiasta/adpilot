'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, MessageCircle } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

interface Ticket {
  id: string
  subject: string
  message: string
  status: string
  createdAt: string
  user: { name: string; email: string }
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/admin/support')
      const data = await res.json()
      if (res.ok) setTickets(data.tickets || [])
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  const handleClose = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/support/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CLOSED' })
      })
      if (res.ok) fetchTickets()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <MessageCircle className="h-8 w-8 text-primary" />
          Gerenciamento de Chamados
        </h1>
        <p className="text-muted-foreground mt-1">Veja os tickets de suporte abertos pelos clientes.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chamados Recentes</CardTitle>
          <CardDescription>Responda ou feche os chamados.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 flex justify-center"><Loader2 className="animate-spin" /></div>
          ) : tickets.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum chamado no momento.</p>
          ) : (
            <div className="space-y-4">
              {tickets.map(t => (
                <div key={t.id} className="border rounded-lg p-4 bg-card">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg">{t.subject}</h3>
                      <p className="text-xs text-muted-foreground">De: {t.user.name} ({t.user.email})</p>
                    </div>
                    <Badge variant={t.status === 'OPEN' ? 'warning' : 'success'}>
                      {t.status === 'OPEN' ? 'Aberto' : 'Fechado'}
                    </Badge>
                  </div>
                  <div className="mt-3 p-3 bg-muted/30 rounded text-sm whitespace-pre-wrap">
                    {t.message}
                  </div>
                  <div className="mt-4 flex justify-between items-center text-xs text-muted-foreground">
                    <span>{new Date(t.createdAt).toLocaleString('pt-BR')}</span>
                    {t.status === 'OPEN' && (
                      <Button size="sm" onClick={() => handleClose(t.id)}>
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Marcar como Resolvido
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}