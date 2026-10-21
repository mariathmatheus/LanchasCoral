import { prisma } from '@/lib/prisma'
import { requireRoot } from '@/lib/auth'
import { PageHeader, TableCard, theadCls, rowCls } from '@/components/admin/Shell'
import { NovoUsuarioForm } from './NovoUsuarioForm'
import { DeletarUsuario } from './DeletarUsuario'

export const dynamic = 'force-dynamic'

export default async function UsuariosPage() {
  const current = await requireRoot()
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  })

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <PageHeader title="Usuários" count={`${users.length} conta${users.length !== 1 ? 's' : ''}`} />

      <TableCard>
        <table className="w-full text-sm">
          <thead>
            <tr className={theadCls}>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Nível</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={rowCls}>
                <td className="px-4 py-3 text-[var(--text-body)]">{u.email}</td>
                <td className="px-4 py-3 text-[var(--text-muted)]">{u.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                    u.role === 'ROOT' ? 'bg-amber-100 text-amber-700' : 'bg-ocean-100 text-ocean-700'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {u.id !== current.id && u.role !== 'ROOT' && (
                    <DeletarUsuario userId={u.id} email={u.email} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>

      <section>
        <h2 className="mb-1 text-base font-semibold text-[var(--text-strong)]">Criar conta ADMIN</h2>
        <p className="mb-4 text-sm text-[var(--text-muted)]">
          Novos usuários recebem nível ADMIN. Apenas uma conta ROOT existe e não pode ser deletada.
        </p>
        <NovoUsuarioForm />
      </section>
    </div>
  )
}
