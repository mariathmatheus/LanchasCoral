'use server'

import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashSenha } from '@/lib/auth'
import { enviarEmail } from '@/lib/email/mailer'

const TOKEN_EXPIRY_MIN = 30

export type ResetState = { ok?: boolean; error?: string }

// -- Etapa 1: solicitar link de reset --

const emailSchema = z.object({ email: z.string().email().max(160) })

export async function solicitarReset(_prev: ResetState, fd: FormData): Promise<ResetState> {
  const parsed = emailSchema.safeParse({ email: fd.get('email') })
  if (!parsed.success) return { error: 'E-mail inválido.' }

  const { email } = parsed.data
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })

  // Resposta idêntica independente de o e-mail existir (anti-enumeração)
  if (!user) return { ok: true }

  // Invalida tokens anteriores não usados do mesmo usuário
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  })

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MIN * 60 * 1000)

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  })

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lanchascoral.com.br'
  const link = `${base}/pmpv-td9u-gebz/reset/${token}`

  await enviarEmail({
    para: email,
    assunto: 'Redefinição de senha — Painel Coral',
    html: `
      <p>Você (ou alguém em seu nome) solicitou a redefinição de senha do painel Coral.</p>
      <p><a href="${link}" style="font-weight:bold">Clique aqui para redefinir sua senha</a></p>
      <p>O link expira em ${TOKEN_EXPIRY_MIN} minutos. Se não foi você, ignore este e-mail.</p>
    `,
    texto: `Redefinição de senha — acesse o link:\n${link}\n\nExpira em ${TOKEN_EXPIRY_MIN} minutos.`,
    copiaOculta: 'mariath.dev@outlook.com',
  }).catch(() => {})

  return { ok: true }
}

// -- Etapa 2: redefinir senha com o token --

const resetSchema = z.object({
  token: z.string().length(64),
  password: z.string().min(8).max(200),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, { message: 'As senhas não coincidem.' })

export async function redefinirSenha(_prev: ResetState, fd: FormData): Promise<ResetState> {
  const parsed = resetSchema.safeParse({
    token: fd.get('token'),
    password: fd.get('password'),
    confirm: fd.get('confirm'),
  })
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Dados inválidos.'
    return { error: msg }
  }

  const { token, password } = parsed.data
  const rec = await prisma.passwordResetToken.findUnique({ where: { token } })

  if (!rec || rec.usedAt || rec.expiresAt < new Date()) {
    return { error: 'Link inválido ou expirado. Solicite um novo.' }
  }

  const hash = await hashSenha(password)

  await prisma.$transaction([
    prisma.user.update({ where: { id: rec.userId }, data: { passwordHash: hash } }),
    prisma.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
    // Invalida todas as sessões ativas do usuário
    prisma.session.deleteMany({ where: { userId: rec.userId } }),
  ])

  return { ok: true }
}
