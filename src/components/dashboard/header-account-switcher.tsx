'use client'

import { useEffect, useState } from 'react'
import { useSettings } from '@/lib/store'
import { useAuth } from '@/lib/auth-store'
import { Layers, ChevronDown, Check, RefreshCw } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface AdAccount {
  id: string
  accountId: string
  name: string
  currency: string
}

export function HeaderAccountSwitcher() {
  const settings = useSettings()
  const auth = useAuth()
  const [accounts, setAccounts] = useState<AdAccount[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchAccounts = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/facebook/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': auth.user?.id || '',
        },
        body: JSON.stringify({
          accessToken: settings.fbAccessToken,
          useAdminToken: settings.useAdminFbToken,
        }),
      })
      const data = await res.json()
      if (res.ok && data.accounts) {
        setAccounts(data.accounts)
        // Se ainda não tiver conta selecionada, seleciona a primeira
        if (!settings.fbAdAccountId && data.accounts.length > 0) {
          selectAccount(data.accounts[0].id)
        }
      }
    } catch (e) {
      console.error('Erro ao buscar contas no Header:', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (mounted && (settings.fbAccessToken || settings.useAdminFbToken || auth.user?.id)) {
      fetchAccounts()
    }
  }, [mounted, settings.fbAccessToken, settings.useAdminFbToken, auth.user?.id])

  const selectAccount = async (adAccountId: string) => {
    if (adAccountId === settings.fbAdAccountId) return
    settings.setFbKeys({ fbAdAccountId })

    if (auth.user?.id) {
      await fetch('/api/user/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': auth.user.id,
        },
        body: JSON.stringify({
          fbAdAccountId: adAccountId,
          ...(settings.fbAccessToken ? { fbAccessToken: settings.fbAccessToken } : {}),
        }),
      }).catch(console.error)
    }

    // Recarrega a página para atualizar métricas de todas as abas e componentes
    window.location.reload()
  }

  if (!mounted) return null

  // Se não tem nem token próprio nem admin habilitado, não exibe
  if (!settings.fbAccessToken && !settings.useAdminFbToken && accounts.length === 0) {
    return null
  }

  const currentAccount = accounts.find((a) => a.id === settings.fbAdAccountId)
  const displayName = currentAccount
    ? currentAccount.name
    : settings.fbAdAccountId
    ? settings.fbAdAccountId
    : 'Selecionar Conta de Anúncios'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 max-w-[280px] sm:max-w-[360px] gap-2 px-2.5 bg-background/50 border-border hover:bg-accent text-xs font-medium justify-between shadow-xs cursor-pointer"
        >
          <div className="flex items-center gap-2 truncate">
            <div className="h-4 w-4 rounded bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <Layers className="h-3 w-3" />
            </div>
            <span className="truncate">{displayName}</span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[320px] max-h-[400px] overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between text-xs py-1.5">
          <span>Minhas Contas Meta Ads</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation()
              fetchAccounts()
            }}
            disabled={isLoading}
            title="Atualizar lista de contas"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {accounts.length === 0 ? (
          <div className="p-3 text-center text-xs text-muted-foreground">
            {isLoading ? 'Carregando contas...' : 'Nenhuma conta encontrada.'}
          </div>
        ) : (
          accounts.map((acc) => {
            const isSelected = acc.id === settings.fbAdAccountId
            return (
              <DropdownMenuItem
                key={acc.id}
                onClick={() => selectAccount(acc.id)}
                className={`flex items-start justify-between gap-2 p-2 cursor-pointer ${
                  isSelected ? 'bg-primary/10 font-semibold' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs">{acc.name}</span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-muted">
                      {acc.currency}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{acc.id}</p>
                </div>
                {isSelected && <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
              </DropdownMenuItem>
            )
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
