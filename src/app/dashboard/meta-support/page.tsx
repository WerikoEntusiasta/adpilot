'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { HelpCircle, Send, Loader2, BookOpen, ShieldAlert, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettings } from '@/lib/store'

export default function MetaSupportPage() {
  const settings = useSettings()
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: 'Olá! Sou seu Especialista em Suporte e Documentação Meta Ads. Está enfrentando algum erro, rejeição de anúncio ou dúvida sobre o Gerenciador de Anúncios? Como posso ajudar?'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    const newMessages = [...messages, { role: 'user' as const, content: input }]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/ai/meta-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          endpoint: settings.aiEndpoint,
          apiKey: settings.aiApiKey,
          model: settings.aiModel,
        }),
      })

      const data = await res.json()
      if (res.ok && data.reply) {
        setMessages([...newMessages, { role: 'assistant', content: data.reply }])
      } else {
        setMessages([...newMessages, { role: 'assistant', content: '❌ Erro ao consultar documentação: ' + (data.error || 'Tente novamente.') }])
      }
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: '❌ Erro de conexão com o suporte.' }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <HelpCircle className="h-8 w-8 text-primary" />
          Ajuda & Documentação Meta
        </h1>
        <p className="text-muted-foreground mt-1">
          Tire dúvidas técnicas, resolva bugs, bloqueios e entenda as políticas e funções oficiais do Facebook Ads Manager.
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="p-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" /> Tópicos Frequentes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2 text-xs">
              <button 
                onClick={() => setInput('Como resolver o erro de Conta de Anúncios Desativada por políticas?')}
                className="text-left w-full p-2 rounded hover:bg-muted/80 transition-colors border"
              >
                🚫 Conta Desativada
              </button>
              <button 
                onClick={() => setInput('Como configurar a API de Conversões (CAPI) via Gateway?')}
                className="text-left w-full p-2 rounded hover:bg-muted/80 transition-colors border"
              >
                ⚡ API de Conversões (CAPI)
              </button>
              <button 
                onClick={() => setInput('Quais são os tamanhos e formatos ideais para anúncios no Reels e Feed?')}
                className="text-left w-full p-2 rounded hover:bg-muted/80 transition-colors border"
              >
                📐 Dimensões de Criativos
              </button>
              <button 
                onClick={() => setInput('Por que meu público de Lookalike não está entregando?')}
                className="text-left w-full p-2 rounded hover:bg-muted/80 transition-colors border"
              >
                👥 Erros em Públicos
              </button>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3">
          <Card className="flex flex-col h-[650px]">
            <CardHeader className="border-b py-3 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Chat Técnico Oficial Meta
              </CardTitle>
              <CardDescription className="text-xs">Respostas baseadas nas diretrizes e APIs da Meta</CardDescription>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m, idx) => (
                <div key={idx} className={cn('flex flex-col', m.role === 'user' ? 'items-end' : 'items-start')}>
                  <div className={cn(
                    'p-3 rounded-2xl max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap',
                    m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted border'
                  )}>
                    {m.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted rounded-xl w-fit">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Consultando base de conhecimento da Meta...
                </div>
              )}
            </CardContent>

            <CardFooter className="p-3 border-t">
              <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex w-full gap-2 items-center">
                <Textarea 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Descreva o erro, bug ou dúvida da documentação..."
                  className="min-h-[44px] h-[44px] resize-none"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                />
                <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}