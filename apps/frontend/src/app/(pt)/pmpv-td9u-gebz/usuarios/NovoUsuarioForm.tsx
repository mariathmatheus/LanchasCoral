'use client'

import { useActionState } from 'react'
import { criarUsuario, type UsuarioState } from './actions'

const inputCls =
  'mt-1.5 w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-2.5 text-sm text-[var(--text-strong)] outline-none transition-colors duration-[140ms] placeholder:text-[var(--text-muted)] hover:border-[var(--border-strong)] focus:border-ocean-700'

export function NovoUsuarioForm() {
  const [state, action, pending] = useActionState<UsuarioState, FormData>(criarUsuario, {})

  return (
    <form action={action} className="space-y-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
      {state.ok && (
        <p className="rounded-[var(--radius-sm)] border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
          Conta criada com sucesso.
        </p>
      )}
      {state.error && (
        <p role="alert" className="rounded-[var(--radius-sm)] border border-danger-500/30 bg-danger-500/10 px-3 py-2 text-sm font-medium text-danger-500">
          {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-body)]">E-mail *</label>
          <input name="email" type="email" required placeholder="novo@coral.com.br" className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-body)]">Nome</label>
          <input name="name" type="text" placeholder="Nome completo" className={inputCls} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-body)]">Senha provisória *</label>
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
        <p className="mt-1 text-xs text-[var(--text-muted)]">Mínimo 8 caracteres. O usuário poderá redefinir via "Esqueceu a senha?".</p>
      </div>

      <button
        type="submit" disabled={pending}
        className="btn-press rounded-[var(--radius-pill)] bg-ocean-600 px-5 py-2.5 text-sm font-semibold text-pearl-0 hover:bg-ocean-500 disabled:opacity-60"
      >
        {pending ? 'Criando…' : 'Criar conta'}
      </button>
    </form>
  )
}
