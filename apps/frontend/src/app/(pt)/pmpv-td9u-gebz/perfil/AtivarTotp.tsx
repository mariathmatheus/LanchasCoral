'use client'

import { useActionState, useState, useTransition } from 'react'
import { ativarTotp, iniciarTotp, type TotpState } from './actions'

const inputCls =
  'mt-1.5 w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-2.5 text-center text-xl font-mono tracking-[0.3em] text-[var(--text-strong)] outline-none transition-colors duration-[140ms] placeholder:text-[var(--text-muted)] hover:border-[var(--border-strong)] focus:border-ocean-700'

export function AtivarTotp() {
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [iniciando, startIniciar] = useTransition()
  const [state, action, pending] = useActionState<TotpState, FormData>(ativarTotp, {})

  async function handleIniciar() {
    startIniciar(async () => {
      const res = await iniciarTotp()
      if ('error' in res) { alert(res.error); return }
      // Busca o QR via endpoint interno para não expor o secret no bundle
      const r = await fetch(`/pmpv-td9u-gebz/perfil/qr?secret=${encodeURIComponent(res.secret)}`)
      const { dataUrl } = await r.json() as { dataUrl: string }
      setQrUrl(dataUrl)
    })
  }

  if (state.ok) {
    return (
      <div className="rounded-[var(--radius-sm)] border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
        Autenticação de dois fatores ativada com sucesso.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {!qrUrl ? (
        <button
          onClick={handleIniciar}
          disabled={iniciando}
          className="btn-press rounded-[var(--radius-pill)] bg-ocean-600 px-5 py-2.5 text-sm font-semibold text-pearl-0 hover:bg-ocean-500 disabled:opacity-60"
        >
          {iniciando ? 'Gerando…' : 'Configurar 2FA'}
        </button>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-body)]">
            Escaneie o QR code com o Google Authenticator, Authy ou outro app TOTP:
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="QR Code 2FA" className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] p-2" width={204} height={204} />
          <p className="text-sm text-[var(--text-muted)]">
            Após escanear, informe o código de 6 dígitos para confirmar:
          </p>
          <form action={action} className="space-y-3">
            <input
              name="code" type="text" inputMode="numeric"
              pattern="[0-9 ]*" maxLength={8} required autoFocus
              autoComplete="one-time-code" placeholder="000 000"
              className={inputCls}
            />
            {state.error && (
              <p role="alert" className="text-sm font-medium text-danger-500">{state.error}</p>
            )}
            <button
              type="submit" disabled={pending}
              className="btn-press w-full rounded-[var(--radius-pill)] bg-ocean-600 px-4 py-2.5 text-sm font-semibold text-pearl-0 hover:bg-ocean-500 disabled:opacity-60"
            >
              {pending ? 'Verificando…' : 'Ativar 2FA'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
