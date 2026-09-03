import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { accessToken: clientToken, useAdminToken } = await request.json()

    let accessToken = clientToken

    if (useAdminToken) {
      const global = await prisma.globalSetting.findUnique({ where: { id: 'GLOBAL' } })
      if (!global || !global.fbAccessToken) {
        return NextResponse.json({ error: 'O Administrador ainda não configurou um Token Global da Agência.' }, { status: 400 })
      }
      accessToken = global.fbAccessToken
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'Nenhum Access Token fornecido' }, { status: 400 })
    }

    const url = new URL('https://graph.facebook.com/v21.0/me/adaccounts')
    url.searchParams.set('access_token', accessToken.trim())
    url.searchParams.set('fields', 'name,account_id,id,currency,account_status')
    url.searchParams.set('limit', '100')

    const res = await fetch(url.toString())
    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      return NextResponse.json({ error: error?.error?.message || 'Erro ao buscar contas de anúncio' }, { status: res.status })
    }

    const data = await res.json()
    const accounts = (data.data || []).map((acc: { id: string; account_id: string; name?: string; currency?: string }) => ({
      id: acc.id, // act_123456789
      accountId: acc.account_id, // 123456789
      name: acc.name || `Conta ${acc.account_id}`,
      currency: acc.currency || 'BRL',
    }))

    return NextResponse.json({ accounts })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao listar contas de anúncios'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
