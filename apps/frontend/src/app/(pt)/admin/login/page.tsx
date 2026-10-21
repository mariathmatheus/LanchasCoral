'use client'

import { useRef } from 'react'
import { registrarHoneypot } from '../honeypot-log'

/**
 * Honeypot: formulário de login falso em /admin.
 * Parece real mas nunca autentica — só loga o IP e envia alerta.
 */
export default function HoneypotLogin() {
  const ref = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData(ref.current!)
    // Captura UA do browser para o log
    fd.set('_ua', navigator.userAgent)
    await registrarHoneypot(fd)
    // Simula erro genérico — nunca deixa entrar
    const err = ref.current?.querySelector('[data-err]') as HTMLElement | null
    if (err) err.textContent = 'Credenciais inválidas.'
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a1628] p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-xl">
        <h1 className="mb-6 font-sans text-xl font-semibold text-gray-900">Painel administrativo</h1>
        <form ref={ref} onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">E-mail</label>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Senha</label>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <p data-err className="min-h-[20px] text-sm text-red-600" role="alert" />
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  )
}
