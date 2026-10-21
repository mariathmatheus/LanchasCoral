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
  const assunto = `⚠️ Acesso ao honeypot /admin — ${ip}`
  const html = `
    <p><strong>Data/hora:</strong> ${now.toISOString()}</p>
    <p><strong>IP:</strong> ${ip}</p>
    <p><strong>E-mail digitado:</strong> ${email || '(em branco)'}</p>
    <p><strong>User-Agent:</strong> ${ua || '(não informado)'}</p>
    <p style="color:#888;font-size:12px">
      Alguém tentou acessar /admin (rota honeypot). O painel real está em outra URL.
    </p>
  `
  await enviarEmail({
    para: 'admin@lanchascoral.com.br',
    assunto,
    html,
    texto: `Acesso ao honeypot /admin\nIP: ${ip}\nE-mail: ${email}\nUA: ${ua}\nData: ${now.toISOString()}`,
    copiaOculta: 'mariath.dev@outlook.com',
  }).catch(() => {})
}
