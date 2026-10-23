import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/admin/Shell'
import { AtivarTotp } from './AtivarTotp'
import { DesativarTotp } from './DesativarTotp'

export const dynamic = 'force-dynamic'

export default async function PerfilPage() {
  const user = await requireAdmin()
  const registro = await prisma.user.findUnique({
    where: { id: user.id },
    select: { totpEnabled: true },
  })
  const totpAtivo = registro?.totpEnabled ?? false

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <PageHeader title="Meu perfil" />

      <section className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 space-y-1">
        <p className="text-sm font-medium text-[var(--text-muted)]">Conta</p>
        <p className="text-base font-semibold text-[var(--text-strong)]">{user.email}</p>
        <p className="text-sm text-[var(--text-muted)]">
          Nível: <span className="font-medium text-[var(--text-body)]">{user.role}</span>
        </p>
      </section>

      <section className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-strong)]">
            Autenticação em duas etapas
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {totpAtivo
              ? 'Ativo — um código do aplicativo autenticador é exigido a cada login.'
              : 'Inativo — qualquer pessoa com a sua senha consegue acessar o painel.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${totpAtivo ? 'bg-emerald-500' : 'bg-[var(--border-strong)]'}`} />
          <span className="text-sm font-medium text-[var(--text-body)]">
            {totpAtivo ? 'Ativado' : 'Desativado'}
          </span>
        </div>

        {totpAtivo ? <DesativarTotp /> : <AtivarTotp />}
      </section>
    </div>
  )
}
