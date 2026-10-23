'use client'

import { useActionState, useState } from 'react'
import { desativarTotp, type TotpState } from './actions'

const inputCls =
  'mt-1.5 w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-2.5 text-center text-xl font-mono tracking-[0.3em] text-[var(--text-strong)] outline-none transition-colors duration-[140ms] placeholder:text-[var(--text-muted)] hover:border-[var(--border-strong)] focus:border-ocean-700'

export function DesativarTotp() {
  const [confirmar, setConfirmar] = useState(false)
  const [state, action, pending] = useActionState<TotpState, FormData>(desativarTotp, {})

  if (state.ok) {
    return (
      <div className="rounded-[var(--radius-sm)] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
        2FA desativado. Você pode ativá-lo novamente a qualquer momento.
      </div>
    )
  }

  if (!confirmar) {
    return (
      <button
        onClick={() => setConfirmar(true)}
        className="rounded-[var(--radius-pill)] border border-danger-500 px-5 py-2.5 text-sm font-semibold text-danger-500 hover:bg-danger-500/8"
      >
        Desativar 2FA
      </button>
    )
  }

  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-[var(--text-muted)]">
        Informe o código atual do seu autenticador para confirmar a desativação:
      </p>
      <input
        name="code" type="text" inputMode="numeric"
        pattern="[0-9 ]*" maxLength={8} required autoFocus
        autoComplete="one-time-code" placeholder="000 000"
        className={inputCls}
      />
      {state.error && (
        <p role="alert" className="text-sm font-medium text-danger-500">{state.error}</p>
      )}
      <div className="flex gap-3">
        <button
          type="button" onClick={() => setConfirmar(false)}
          className="rounded-[var(--radius-pill)] border border-[var(--border-strong)] px-4 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--surface-sunken)]"
        >
          Cancelar
        </button>
        <button
          type="submit" disabled={pending}
          className="rounded-[var(--radius-pill)] border border-danger-500 px-4 py-2 text-sm font-semibold text-danger-500 hover:bg-danger-500/8 disabled:opacity-60"
        >
          {pending ? 'Desativando…' : 'Confirmar desativação'}
        </button>
      </div>
    </form>
  )
}
