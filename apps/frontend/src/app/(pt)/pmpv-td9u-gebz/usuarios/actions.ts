'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashSenha, requireRoot } from '@/lib/auth'

export type UsuarioState = { ok?: boolean; error?: string }

const criarSchema = z.object({
  email: z.string().email().max(160),
  name: z.string().max(120).optional(),
  password: z.string().min(8).max(200),
})

export async function criarUsuario(_prev: UsuarioState, fd: FormData): Promise<UsuarioState> {
  await requireRoot()

  const parsed = criarSchema.safeParse({
    email: fd.get('email'),
    name: fd.get('name') || undefined,
    password: fd.get('password'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }

  const { email, name, password } = parsed.data
  const existe = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (existe) return { error: 'Este e-mail já está cadastrado.' }

  const passwordHash = await hashSenha(password)
  await prisma.user.create({
    data: { email: email.toLowerCase().trim(), name, passwordHash, role: 'ADMIN' },
  })

  revalidatePath('/pmpv-td9u-gebz/usuarios')
  return { ok: true }
}

export async function deletarUsuario(userId: string): Promise<UsuarioState> {
  const root = await requireRoot()
  if (userId === root.id) return { error: 'Você não pode excluir sua própria conta.' }

  const alvo = await prisma.user.findUnique({ where: { id: userId } })
  if (!alvo) return { error: 'Usuário não encontrado.' }
  if (alvo.role === 'ROOT') return { error: 'Contas ROOT não podem ser excluídas.' }

  await prisma.session.deleteMany({ where: { userId } })
  await prisma.user.delete({ where: { id: userId } })

  revalidatePath('/pmpv-td9u-gebz/usuarios')
  return { ok: true }
}
