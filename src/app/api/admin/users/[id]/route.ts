import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(body.role && { role: body.role }),
        ...(body.subscriptionStatus && { subscriptionStatus: body.subscriptionStatus }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        subscriptionStatus: true,
      },
    })

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar usuário no SQLite'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Usuário removido do SQLite com sucesso' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao excluir usuário no SQLite'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
