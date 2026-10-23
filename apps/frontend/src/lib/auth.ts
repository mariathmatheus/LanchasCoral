import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import type { Role } from '@prisma/client'

const COOKIE = 'coral_session'
// Cookie temporário que guarda o userId enquanto aguarda o código 2FA.
// Expira em 10 min — tempo suficiente para abrir o autenticador.
const COOKIE_2FA = 'coral_2fa_pending'
const MAX_AGE_DAYS = 7
const PENDING_2FA_MIN = 10

/*
 * Hash descartável usado quando o e-mail não existe, para que a resposta
 * demore o mesmo que uma senha errada.
 */
const HASH_ISCA = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'

/** Roles com acesso ao painel (ADMIN e ROOT). */
export const PANEL_ROLES: Role[] = ['ADMIN', 'ROOT']

/**
 * Autentica email/senha.
 * - Se 2FA não está ativo: cria sessão e retorna `{ user, needs2fa: false }`.
 * - Se 2FA está ativo: define cookie pendente e retorna `{ user, needs2fa: true }`.
 * - Credenciais inválidas: retorna null.
 */
export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true, email: true, name: true, role: true, passwordHash: true, totpEnabled: true },
  })
  const ok = await bcrypt.compare(password, user?.passwordHash ?? HASH_ISCA)
  if (!user || !ok || !PANEL_ROLES.includes(user.role)) return null

  if (user.totpEnabled) {
    // Etapa 1 de 2: senha ok, aguarda TOTP
    const jar = await cookies()
    jar.set(COOKIE_2FA, user.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: PENDING_2FA_MIN * 60,
    })
    return { user: { id: user.id, email: user.email, name: user.name, role: user.role }, needs2fa: true as const }
  }

  await criarSessao(user.id)
  return { user: { id: user.id, email: user.email, name: user.name, role: user.role }, needs2fa: false as const }
}

/** Conclui o login 2FA: valida o cookie pendente e cria a sessão real. */
export async function completar2fa(userId: string) {
  const jar = await cookies()
  const pending = jar.get(COOKIE_2FA)?.value
  if (!pending || pending !== userId) return false
  jar.delete(COOKIE_2FA)
  await criarSessao(userId)
  return true
}

/** Retorna o userId do cookie pendente de 2FA, ou null. */
export async function pending2faUserId(): Promise<string | null> {
  const jar = await cookies()
  return jar.get(COOKIE_2FA)?.value ?? null
}

async function criarSessao(userId: string) {
  const expiresAt = new Date(Date.now() + MAX_AGE_DAYS * 864e5)
  const session = await prisma.session.create({ data: { userId, expiresAt } })
  const jar = await cookies()
  jar.set(COOKIE, session.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })
}

export async function logout() {
  const jar = await cookies()
  const id = jar.get(COOKIE)?.value
  if (id) await prisma.session.deleteMany({ where: { id } })
  jar.delete(COOKIE)
  jar.delete(COOKIE_2FA)
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
