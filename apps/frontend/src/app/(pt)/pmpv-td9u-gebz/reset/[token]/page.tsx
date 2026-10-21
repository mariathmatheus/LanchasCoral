'use client'

import { useActionState } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/ui'
import { redefinirSenha, type ResetState } from '../actions'

const inputCls =
  'mt-1.5 w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-2.5 text-sm text-[var(--text-strong)] outline-none transition-colors duration-[140ms] placeholder:text-[var(--text-muted)] hover:border-[var(--border-strong)] focus:border-ocean-700'

export default function RedefinirSenhaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [state, action, pending] = useActionState<ResetState, FormData>(redefinirSenha, {})

  return (
    <div className="grid min-h-dvh place-items-center bg-[image:var(--grad-deep)] px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo variant="white" height={30} priority />
        </div>

        <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-7 shadow-[var(--shadow-lg)]">
          <h1 className="font-display text-xl font-semibold tracking-[var(--tracking-display)] text-[var(--text-strong)]">
            Redefinir senha
          </h1>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            Escolha uma nova senha com pelo menos 8 caracteres.
          </p>

          {state.ok ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-[var(--radius-sm)] border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
                Senha redefinida com sucesso. Todas as sessões foram encerradas.
              </div>
              <Link
                href="/pmpv-td9u-gebz/login"
                className="btn-press flex w-full items-center justify-center rounded-[var(--radius-pill)] bg-ocean-600 px-4 py-3 text-sm font-semibold text-pearl-0 hover:bg-ocean-500"
              >
                Ir para o login
              </Link>
            </div>
          ) : (
            <form action={action} className="mt-7 space-y-4">
              <input type="hidden" name="token" value={token} />

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[var(--color-text-body)]">
                  Nova senha
                </label>
                <input
                  id="password" name="password" type="password" required
                  minLength={8} autoComplete="new-password"
                  className={inputCls}
                />
              </div>

              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-[var(--color-text-body)]">
                  Confirmar senha
                </label>
                <input
                  id="confirm" name="confirm" type="password" required
                  minLength={8} autoComplete="new-password"
                  className={inputCls}
                />
              </div>

              {state.error && (
                <p role="alert" className="rounded-[var(--radius-sm)] border border-danger-500/30 bg-danger-500/10 px-3 py-2 text-sm font-medium text-danger-500">
                  {state.error}
                </p>
              )}

              <button
                type="submit" disabled={pending}
                className="btn-press w-full rounded-[var(--radius-pill)] bg-ocean-600 px-4 py-3 text-sm font-semibold text-pearl-0 shadow-[var(--shadow-sm)] hover:bg-ocean-500 active:bg-ocean-700 disabled:opacity-60"
              >
                {pending ? 'Salvando…' : 'Salvar nova senha'}
              </button>
            </form>
          )}

          <p className="mt-5 text-center text-sm text-[var(--text-muted)]">
            <Link href="/pmpv-td9u-gebz/reset" className="text-ocean-600 hover:underline">
              Solicitar novo link
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
