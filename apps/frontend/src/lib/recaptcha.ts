/**
 * reCAPTCHA v3 — graceful degradation quando as chaves não estão configuradas.
 * Cliente: useRecaptcha() retorna uma função que executa o challenge e devolve o token.
 * Servidor: verificarRecaptcha() valida o token; retorna true se inválido ou sem chave.
 */

// -- Cliente (só pode ser importado em arquivos 'use client') --

export function carregarScriptRecaptcha() {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  if (!siteKey || typeof document === 'undefined') return
  if (document.querySelector('script[data-recaptcha]')) return

  const s = document.createElement('script')
  s.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`
  s.async = true
  s.setAttribute('data-recaptcha', '1')
  document.head.appendChild(s)
}

export async function obterTokenRecaptcha(action: string): Promise<string | null> {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  if (!siteKey) return null

  return new Promise((resolve) => {
    const attempt = () => {
      if (typeof window === 'undefined' || !('grecaptcha' in window)) {
        setTimeout(attempt, 300)
        return
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).grecaptcha.ready(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).grecaptcha
          .execute(siteKey, { action })
          .then(resolve)
          .catch(() => resolve(null))
      })
    }
    attempt()
  })
}

// -- Servidor --

export async function verificarRecaptcha(token: string | null): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY
  // Sem chave configurada: deixa passar (graceful degradation)
  if (!secretKey) return true
  if (!token) return false

  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: secretKey, response: token }),
      cache: 'no-store',
    })
    const json = (await res.json()) as { success: boolean; score?: number; action?: string }
    // Score mínimo 0.5 — bloqueia bots mas tolera usuários legítimos
    return json.success && (json.score ?? 1) >= 0.5
  } catch {
    // Falha na rede: não bloqueia o usuário (graceful degradation)
    return true
  }
}
