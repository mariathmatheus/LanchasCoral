'use server'

import { prisma } from '@/lib/prisma'
import { ipDoCliente } from '@/lib/ip'
import { enviarEmail } from '@/lib/email/mailer'

const JANELA_MS = 60 * 60 * 1000  // 1 hora
const LIMITE    = 30               // tentativas na janela antes do bloqueio

/**
 * Registra acesso ao honeypot /admin e envia alerta por e-mail.
 * Após LIMITE acessos em JANELA_MS bloqueia o IP automaticamente.
 */
export async function registrarHoneypot(formData: FormData) {
  const ip    = await ipDoCliente()
  const email = String(formData.get('email') ?? '').slice(0, 200)
  const ua    = String(formData.get('_ua')   ?? '').slice(0, 500)
  const now   = new Date()

  // Grava no banco (reutiliza LoginAttempt — key = "honeypot:<ip>")
  await prisma.loginAttempt.create({
    data: { key: `honeypot:${ip}`, success: false },
  }).catch(() => {})

  // Verifica reincidência na última hora
  const desde    = new Date(now.getTime() - JANELA_MS)
  const contagem = await prisma.loginAttempt.count({
    where: { key: `honeypot:${ip}`, createdAt: { gte: desde } },
  }).catch(() => 0)

  const jaBloqueado = await prisma.blockedIp.findUnique({ where: { ip } }).catch(() => null)
  const deveBloquear = contagem >= LIMITE && !jaBloqueado

  if (deveBloquear) {
    await prisma.blockedIp.create({
      data: { ip, reason: `Honeypot: ${contagem} acessos em 1 hora (${now.toISOString()})` },
    }).catch(() => {})
  }

  // Monta e envia o alerta
  const { envolver, sobrancelha, h1, p, tabelaDados, escapeHtml } = await import('@/lib/email/layout')
  const { anexoDoLogo, temLogo } = await import('@/lib/email/logo')

  const comLogo = await temLogo()
  const logo    = await anexoDoLogo()

  const assunto = deveBloquear
    ? `🚫 IP bloqueado por força-bruta no honeypot — ${ip}`
    : `⚠️ Acesso ao honeypot /admin`

  const corpo = `
    ${sobrancelha('Alerta de segurança')}
    ${h1(deveBloquear ? 'IP bloqueado automaticamente' : 'Acesso ao honeypot /admin')}
    ${p(
      deveBloquear
        ? `O IP <strong>${escapeHtml(ip)}</strong> foi bloqueado após ${contagem} acessos à rota-isca em menos de 1 hora.`
        : 'Alguém tentou acessar <strong>/admin</strong>, a rota-isca. O painel real está em outra URL.',
    )}
    ${tabelaDados([
      { rotulo: 'IP',             valor: escapeHtml(ip) },
      { rotulo: 'Acessos (1 h)',  valor: String(contagem) },
      { rotulo: 'E-mail digitado', valor: escapeHtml(email || '(em branco)') },
      { rotulo: 'User-Agent',     valor: escapeHtml(ua || '(não informado)') },
      { rotulo: 'Data/hora',      valor: escapeHtml(now.toISOString()) },
      ...(deveBloquear ? [{ rotulo: 'Status', valor: '<strong style="color:#b91c1c">BLOQUEADO</strong>' }] : []),
    ])}
  `

  await enviarEmail({
    para: 'admin@lanchascoral.com.br',
    assunto,
    html: envolver(corpo, `${deveBloquear ? 'IP bloqueado' : 'Honeypot'} — ${ip}`, comLogo),
    texto: [
      assunto,
      '',
      `IP: ${ip}`,
      `Acessos (1 h): ${contagem}`,
      `E-mail digitado: ${email || '(em branco)'}`,
      `User-Agent: ${ua || '(não informado)'}`,
      `Data/hora: ${now.toISOString()}`,
      ...(deveBloquear ? ['Status: BLOQUEADO'] : []),
    ].join('\n'),
    copiaOculta: 'mariath.dev@outlook.com',
    anexos: logo ? [logo] : [],
  }).catch(() => {})
}
