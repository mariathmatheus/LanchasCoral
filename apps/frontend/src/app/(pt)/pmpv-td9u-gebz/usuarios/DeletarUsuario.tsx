'use client'

import { useTransition } from 'react'
import { deletarUsuario } from './actions'

export function DeletarUsuario({ userId, email }: { userId: string; email: string }) {
  const [pending, start] = useTransition()

  function handleClick() {
    if (!confirm(`Excluir a conta de ${email}? Esta ação não pode ser desfeita.`)) return
    start(async () => {
      const res = await deletarUsuario(userId)
      if (res.error) alert(res.error)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="rounded px-2 py-1 text-xs font-medium text-danger-500 hover:bg-danger-500/10 disabled:opacity-50"
    >
      {pending ? 'Excluindo…' : 'Excluir'}
    </button>
  )
}
