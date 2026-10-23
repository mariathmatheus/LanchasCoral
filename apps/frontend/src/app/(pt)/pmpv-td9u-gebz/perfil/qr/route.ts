import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { gerarQrDataUrl } from '@/lib/totp'

export async function GET(req: NextRequest) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  // Valida que o secret passado pertence mesmo ao usuário logado
  const secretParam = req.nextUrl.searchParams.get('secret') ?? ''
  const registro = await prisma.user.findUnique({
    where: { id: user.id },
    select: { totpSecret: true },
  })

  // Só gera QR se o secret bate com o que está salvo (evita gerar QR para qualquer string)
  if (!registro?.totpSecret || registro.totpSecret !== secretParam) {
    return NextResponse.json({ error: 'Secret inválido.' }, { status: 400 })
  }

  const dataUrl = await gerarQrDataUrl(user.email, registro.totpSecret)
  return NextResponse.json({ dataUrl }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
