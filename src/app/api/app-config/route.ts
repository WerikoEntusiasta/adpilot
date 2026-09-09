import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const globalSetting = await prisma.globalSetting.findUnique({ where: { id: 'GLOBAL' } })
    
    // We only expose boolean flags or public info here, no secrets
    return NextResponse.json({
      envAiConfigured: !!process.env.OPENAI_API_KEY,
      dbAiConfigured: !!globalSetting?.aiApiKey,
      globalPrice: globalSetting?.globalPrice || 250,
      maintenanceMode: globalSetting?.maintenanceMode || false
    })
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao carregar configurações públicas' }, { status: 500 })
  }
}