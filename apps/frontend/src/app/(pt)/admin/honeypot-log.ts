'use server'

import { prisma } from '@/lib/prisma'
import { ipDoCliente } from '@/lib/ip'
import { enviarEmail } from '@/lib/email/mailer'

/**
 * Registra acesso ao honeypot /admin e envia alerta imediato por email.
 * Usa a mesma tabela LoginAttempt com prefixo "honeypot:" para não criar
 * dependências novas.
 */
export async function registrarHoneypot(formData: FormData) {
  const ip = await ipDoCliente()
  const email = String(formData.get('email') ?? '').slice(0, 200)
  const ua = String(formData.get('_ua') ?? '').slice(0, 500)
  const now = new Date()

  // Grava no banco (reutiliza LoginAttempt — key = "honeypot:<ip>")
  await prisma.loginAttempt.create({
    data: { key: `honeypot:${ip}`, success: false },
  }).catch(() => {})

  // Envia alerta imediato
  const { envolver, sobrancelha, h1, p, tabelaDados, escapeHtml } = await import('@/lib/email/layout')
  const { anexoDoLogo, temLogo } = await import('@/lib/email/logo')

  const comLogo = await temLogo()
  const logo = await anexoDoLogo()

  const assunto = `⚠️ Acesso ao honeypot /admin`
  const corpo = `
    ${sobrancelha('Alerta de segurança')}
    ${h1('Acesso ao honeypot /admin')}
    ${p('Alguém tentou acessar <strong>/admin</strong>, a rota-isca. O painel real está em outra URL.')}
    ${tabelaDados([
      { rotulo: 'Data/hora', valor: escapeHtml(now.toISOString()) },
      { rotulo: 'IP', valor: escapeHtml(ip) },
      { rotulo: 'E-mail digitado', valor: escapeHtml(email || '(em branco)') },
      { rotulo: 'User-Agent', valor: escapeHtml(ua || '(não informado)') },
    ])}
  `
  const html = envolver(
    corpo,
    `Acesso ao honeypot /admin — IP ${ip}`,
    comLogo,
  )

  await enviarEmail({
    para: 'admin@lanchascoral.com.br',
    assunto,
    html,
    texto: `Alerta de segurança — Acesso ao honeypot /admin\n\nData/hora: ${now.toISOString()}\nIP: ${ip}\nE-mail digitado: ${email || '(em branco)'}\nUser-Agent: ${ua || '(não informado)'}`,
    copiaOculta: 'mariath.dev@outlook.com',
    anexos: logo ? [logo] : [],
  }).catch(() => {})
}
