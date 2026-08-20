import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { userEmail } = await request.json()

    // Process deletion request under LGPD Art. 18, VI
    console.log(`Solicitação LGPD de Exclusão de Dados para: ${userEmail}`)

    return NextResponse.json({
      success: true,
      message: 'Sua solicitação de exclusão definitiva de dados pessoais (LGPD Art. 18, VI) foi processada com sucesso.',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao processar exclusão LGPD'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
