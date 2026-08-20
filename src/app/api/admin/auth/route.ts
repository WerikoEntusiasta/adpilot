import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    const envAdminEmail = process.env.ADMIN_EMAIL || 'admin@adpilot.ai'
    const envAdminPassword = process.env.ADMIN_PASSWORD || 'admin123'

    const isMatch = email.trim().toLowerCase() === envAdminEmail.trim().toLowerCase() && password === envAdminPassword

    if (!isMatch) {
      return NextResponse.json({ success: false, error: 'Credenciais de Administrador inválidas' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      admin: {
        email: envAdminEmail,
        role: 'ADMIN',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao autenticar admin'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
