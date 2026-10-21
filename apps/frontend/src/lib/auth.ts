import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import type { Role } from '@prisma/client'

const COOKIE = 'coral_session'
const MAX_AGE_DAYS = 7

/*
 * Hash descartável usado quando o e-mail não existe, para que a resposta
 * demore o mesmo que uma senha errada.
 *
 * Precisa ser um hash bcrypt VÁLIDO. O valor anterior tinha 65 caracteres
 * (o formato pede 60) e o `compare` rejeitava na hora: 0 ms contra 56 ms de
 * um hash real — diferença suficiente para descobrir quais e-mails existem.
 * Este foi gerado com `bcrypt.hashSync(<aleatório>, 10)`.
 */
const HASH_ISCA = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'

/** Roles com acesso ao painel (ADMIN e ROOT). */
export const PANEL_ROLES: Role[] = ['ADMIN', 'ROOT']

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  const ok = await bcrypt.compare(password, user?.passwordHash ?? HASH_ISCA)
  if (!user || !ok || !PANEL_ROLES.includes(user.role)) return null

  const expiresAt = new Date(Date.now() + MAX_AGE_DAYS * 864e5)
  const session = await prisma.session.create({ data: { userId: user.id, expiresAt } })

  const jar = await cookies()
  jar.set(COOKIE, session.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })
  return user
}

export async function logout() {
  const jar = await cookies()
  const id = jar.get(COOKIE)?.value
  if (id) await prisma.session.deleteMany({ where: { id } })
  jar.delete(COOKIE)
}

/** Returns the signed-in user, or null. Clears expired sessions. */
export async function currentUser() {
  const jar = await cookies()
  const id = jar.get(COOKIE)?.value
  if (!id) return null

  const session = await prisma.session.findUnique({ where: { id } })
  if (!session) return null
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id } }).catch(() => {})
    return null
  }
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true },
  })
}

/**
 * Guarda das páginas e actions do painel.
 * Aceita ROOT e ADMIN. Redireciona para a nova rota de login.
 */
export async function requireAdmin() {
  const user = await currentUser()
  if (!user || !PANEL_ROLES.includes(user.role)) redirect('/pmpv-td9u-gebz/login')
  return user
}

/**
 * Guarda das operações exclusivas de ROOT (criar/deletar contas).
 */
export async function requireRoot() {
  const user = await currentUser()
  if (!user || user.role !== 'ROOT') redirect('/pmpv-td9u-gebz/login')
  return user
}

/** Cria hash bcrypt para nova senha. */
export async function hashSenha(senha: string) {
  return bcrypt.hash(senha, 12)
}
