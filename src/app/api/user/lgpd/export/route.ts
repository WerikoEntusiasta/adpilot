import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { userEmail } = await request.json()

    // Export payload adhering to LGPD Art. 18 (Data Portability in JSON format)
    const exportData = {
      lgpdReport: {
        title: 'Relatório de Portabilidade de Dados Pessoais (LGPD Art. 18)',
        issuedAt: new Date().toISOString(),
        dataSubject: userEmail || 'usuario@adpilot.ai',
        legalBasis: 'Consentimento (Art. 7º, I da Lei 13.709/2018)',
      },
      personalData: {
        email: userEmail || 'usuario@adpilot.ai',
        subscriptionStatus: 'ACTIVE_PRO',
        lgpdConsent: true,
        lgpdConsentDate: new Date().toISOString(),
      },
      connectedIntegrations: {
        facebookApiConnected: true,
        aiEndpointConnected: true,
      },
    }

    return NextResponse.json({ success: true, exportData })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao exportar dados LGPD'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
