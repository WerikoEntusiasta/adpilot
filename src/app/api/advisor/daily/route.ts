import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('X-User-Id')
    if (!userId) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 })
    }

    // Obter a data atual no fuso horário de Brasília (UTC-3)
    const today = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()).split('/').reverse().join('-')

    const record = await prisma.dailyAdvisorSuggestion.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    })

    if (record) {
      try {
        const suggestions = JSON.parse(record.suggestions)
        return NextResponse.json({
          date: record.date,
          createdAt: record.createdAt,
          suggestions,
        })
      } catch {
        return NextResponse.json({ suggestions: [] })
      }
    }

    return NextResponse.json({ suggestions: null })
  } catch (error) {
    console.error('Erro ao buscar sugestões diárias:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('X-User-Id')
    if (!userId) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 })
    }

    const { suggestions } = await request.json()
    if (!suggestions || !Array.isArray(suggestions)) {
      return NextResponse.json({ error: 'Sugestões inválidas' }, { status: 400 })
    }

    const today = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()).split('/').reverse().join('-')

    const saved = await prisma.dailyAdvisorSuggestion.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      update: {
        suggestions: JSON.stringify(suggestions),
      },
      create: {
        userId,
        date: today,
        suggestions: JSON.stringify(suggestions),
      },
    })

    return NextResponse.json({ success: true, saved })
  } catch (error) {
    console.error('Erro ao salvar sugestões diárias:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
