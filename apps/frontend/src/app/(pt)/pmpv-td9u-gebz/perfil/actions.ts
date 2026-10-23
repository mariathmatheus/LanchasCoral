'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { gerarSecret, verificarCodigo } from '@/lib/totp'

export type TotpState = { ok?: boolean; error?: string }

/** Gera um novo secret TOTP e salva no usuário (ainda não ativado). */
export async function iniciarTotp(): Promise<{ secret: string } | { error: string }> {
  const user = await requireAdmin()
  const secret = gerarSecret()
  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: secret, totpEnabled: false },
  })
  return { secret }
}

/** Confirma o código e ativa o 2FA. */
export async function ativarTotp(_prev: TotpState, fd: FormData): Promise<TotpState> {
  const user = await requireAdmin()
  const code = String(fd.get('code') ?? '').replace(/\s/g, '')
  if (!code || code.length < 6) return { error: 'Informe o código de 6 dígitos.' }

  const registro = await prisma.user.findUnique({
    where: { id: user.id },
    select: { totpSecret: true },
  })
  if (!registro?.totpSecret) return { error: 'Inicie a configuração novamente.' }

  if (!verificarCodigo(registro.totpSecret, code)) {
    return { error: 'Código incorreto. Verifique o horário do dispositivo.' }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: true },
  })
  revalidatePath('/pmpv-td9u-gebz/perfil')
  return { ok: true }
}

/** Desativa o 2FA do usuário logado após confirmar senha. */
export async function desativarTotp(_prev: TotpState, fd: FormData): Promise<TotpState> {
  const user = await requireAdmin()
  const code = String(fd.get('code') ?? '').replace(/\s/g, '')
  if (!code || code.length < 6) return { error: 'Informe o código atual para desativar.' }

  const registro = await prisma.user.findUnique({
    where: { id: user.id },
    select: { totpSecret: true, totpEnabled: true },
  })
  if (!registro?.totpEnabled || !registro.totpSecret) {
    return { error: '2FA não está ativo.' }
  }

  if (!verificarCodigo(registro.totpSecret, code)) {
    return { error: 'Código incorreto.' }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: false, totpSecret: null },
  })
  revalidatePath('/pmpv-td9u-gebz/perfil')
  return { ok: true }
}
