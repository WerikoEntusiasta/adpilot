'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { LifeBuoy, Loader2, Plus, MessageCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/lib/auth-store'

interface Ticket {
  id: string
  subject: string
  message: string
  status: string
  createdAt: string
}

export default function SupportPage() {
  const auth = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchTickets = async () => {
    if (!auth.user) return
    try {
      const res = await fetch('/api/support', {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'X-User-Id': auth.user.id
        }
      })
      const data = await res.json()
      if (res.ok) setTickets(data.tickets || [])
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (auth.token) fetchTickets()
  }, [auth.token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject || !message) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`,
          'X-User-Id': auth.user?.id || ''
        },
        body: JSON.stringify({ subject, message })
      })
      if (res.ok) {
        setIsModalOpen(false)
        setSubject('')
        setMessage('')
        fetchTickets()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <LifeBuoy className="h-8 w-8 text-primary" />
            Suporte AdPilot
          </h1>
          <p className="text-muted-foreground mt-1">Abra chamados para tirar dúvidas ou relatar problemas.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo Chamado
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meus Chamados</CardTitle>
          <CardDescription>Histórico de solicitações enviadas ao administrador.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 flex justify-center items-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" /> Carregando...
            </div>
          ) : tickets.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
              <MessageCircle className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p>Nenhum chamado aberto ainda.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map(t => (
                <div key={t.id} className="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold">{t.subject}</h3>
                    <Badge variant={t.status === 'OPEN' ? 'warning' : 'success'}>
                      {t.status === 'OPEN' ? 'Aberto' : 'Respondido / Fechado'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{t.message}</p>
                  <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                    Criado em {new Date(t.createdAt).toLocaleDateString('pt-BR')} às {new Date(t.createdAt).toLocaleTimeString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir Novo Chamado</DialogTitle>
            <DialogDescription>
              Descreva sua dúvida ou problema. O suporte responderá o mais rápido possível.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Assunto</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} required placeholder="Ex: Dúvida sobre IA" />
            </div>
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea 
                value={message} 
                onChange={e => setMessage(e.target.value)} 
                required 
                placeholder="Detalhe aqui o que você precisa..."
                className="min-h-[120px]"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : 'Enviar Chamado'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}