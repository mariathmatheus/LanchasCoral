'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { login, logout, completar2fa, pending2faUserId } from '@/lib/auth'
import { ipDoCliente } from '@/lib/ip'
import { mensagemBloqueio, registrarTentativa, verificarBloqueio } from '@/lib/rate-limit'
import { verificarRecaptcha } from '@/lib/recaptcha'
import { verificarCodigo } from '@/lib/totp'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  email: z.string().email().max(160),
  password: z.string().min(1).max(200),
})

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData) {
  const parsed = schema.safeParse({
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  })

  const GENERICO = 'Credenciais inválidas.'
  if (!parsed.success) return { error: GENERICO }

  const { email, password } = parsed.data
  const ip = await ipDoCliente()

  const recaptchaOk = await verificarRecaptcha(String(formData.get('_recaptcha') ?? ''))
  if (!recaptchaOk) return { error: 'Verificação de segurança falhou. Tente novamente.' }

  const bloqueio = await verificarBloqueio(ip, email)
  if (bloqueio.bloqueado) {
    return { error: mensagemBloqueio(bloqueio.esperarSegundos) }
  }

  const result = await login(email, password)
  await registrarTentativa(ip, email, Boolean(result))

  if (!result) {
    await new Promise((r) => setTimeout(r, 400))
    return { error: GENERICO }
  }

  revalidatePath('/pmpv-td9u-gebz')

  if (result.needs2fa) {
    redirect('/pmpv-td9u-gebz/login/2fa')
  }

  redirect('/pmpv-td9u-gebz')
}

export async function logoutAction() {
  await logout()
  redirect('/pmpv-td9u-gebz/login')
}

// -- Validação do código 2FA --

const totpSchema = z.object({ code: z.string().min(6).max(8) })

export async function verificar2faAction(_prev: { error?: string } | undefined, formData: FormData) {
  const parsed = totpSchema.safeParse({ code: String(formData.get('code') ?? '') })
  if (!parsed.success) return { error: 'Código inválido.' }

  const userId = await pending2faUserId()
  if (!userId) redirect('/pmpv-td9u-gebz/login')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpSecret: true, totpEnabled: true },
  })

  if (!user?.totpEnabled || !user.totpSecret) redirect('/pmpv-td9u-gebz/login')

  const ok = verificarCodigo(user.totpSecret, parsed.data.code)
  if (!ok) return { error: 'Código incorreto ou expirado.' }

  await completar2fa(userId)
  revalidatePath('/pmpv-td9u-gebz')
  redirect('/pmpv-td9u-gebz')
}
