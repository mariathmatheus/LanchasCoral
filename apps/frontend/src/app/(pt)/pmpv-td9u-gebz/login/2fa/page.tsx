'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/ui'
import { verificar2faAction } from '../../actions'

const inputCls =
  'mt-1.5 w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-2.5 text-center text-xl font-mono tracking-[0.3em] text-[var(--text-strong)] outline-none transition-colors duration-[140ms] placeholder:text-[var(--text-muted)] hover:border-[var(--border-strong)] focus:border-ocean-700'

export default function TwoFactorPage() {
  const [state, action, pending] = useActionState(verificar2faAction, undefined)

  return (
    <div className="grid min-h-dvh place-items-center bg-[image:var(--grad-deep)] px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo variant="white" height={30} priority />
        </div>

        <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-7 shadow-[var(--shadow-lg)]">
          <h1 className="font-display text-xl font-semibold tracking-[var(--tracking-display)] text-[var(--text-strong)]">
            Verificação em duas etapas
          </h1>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            Abra seu aplicativo autenticador e informe o código de 6 dígitos.
          </p>

          <form action={action} className="mt-7 space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-[var(--color-text-body)]">
                Código
              </label>
              <input
                id="code" name="code" type="text" inputMode="numeric"
                pattern="[0-9 ]*" maxLength={8} required autoFocus
                autoComplete="one-time-code"
                placeholder="000 000"
                className={inputCls}
              />
            </div>

            {state?.error && (
              <p role="alert" className="rounded-[var(--radius-sm)] border border-danger-500/30 bg-danger-500/10 px-3 py-2 text-sm font-medium text-danger-500">
                {state.error}
              </p>
            )}

            <button
              type="submit" disabled={pending}
              className="btn-press w-full rounded-[var(--radius-pill)] bg-ocean-600 px-4 py-3 text-sm font-semibold text-pearl-0 shadow-[var(--shadow-sm)] hover:bg-ocean-500 active:bg-ocean-700 disabled:opacity-60"
            >
              {pending ? 'Verificando…' : 'Confirmar'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[var(--text-muted)]">
            <Link href="/pmpv-td9u-gebz/login" className="text-ocean-600 hover:underline">
              Voltar ao login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
