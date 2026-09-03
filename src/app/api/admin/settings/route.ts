import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    let globalSetting = await prisma.globalSetting.findUnique({
      where: { id: 'GLOBAL' }
    })
    
    if (!globalSetting) {
      globalSetting = await prisma.globalSetting.create({
        data: {
          id: 'GLOBAL',
        }
      })
    }
    
    return NextResponse.json({ success: true, settings: globalSetting })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Erro ao buscar configurações globais' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    
    const globalSetting = await prisma.globalSetting.upsert({
      where: { id: 'GLOBAL' },
      update: {
        ...(body.aiEndpoint !== undefined && { aiEndpoint: body.aiEndpoint }),
        ...(body.aiApiKey !== undefined && { aiApiKey: body.aiApiKey }),
        ...(body.aiModel !== undefined && { aiModel: body.aiModel }),
        ...(body.globalPrice !== undefined && { globalPrice: Number(body.globalPrice) }),
        ...(body.maintenanceMode !== undefined && { maintenanceMode: Boolean(body.maintenanceMode) }),
        ...(body.fbAccessToken !== undefined && { fbAccessToken: body.fbAccessToken }),
      },
      create: {
        id: 'GLOBAL',
        aiEndpoint: body.aiEndpoint,
        aiApiKey: body.aiApiKey,
        aiModel: body.aiModel,
        globalPrice: Number(body.globalPrice) || 250,
        maintenanceMode: Boolean(body.maintenanceMode) || false,
        fbAccessToken: body.fbAccessToken,
      }
    })
    
    return NextResponse.json({ success: true, settings: globalSetting })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar configurações globais' }, { status: 500 })
  }
}
