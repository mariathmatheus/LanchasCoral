import SiteHeader from '@/components/SiteHeader'
import { SectionHeading } from '@/components/ui'
import type { ReactNode } from 'react'
import type { Locale } from '@/i18n/config'

/**
 * Casca para paginas institucionais: cabecalho escuro com gradiente e um
 * corpo em coluna estreita. Mantem essas paginas coerentes com o resto do
 * sistema sem repetir a estrutura em cada arquivo.
 */
export default function PageShell({
  eyebrow,
  title,
  lede,
  active = '',
  locale = 'pt',
  children,
}: {
  eyebrow?: string
  title: string
  lede?: string
  active?: string
  locale?: Locale
  children?: ReactNode
}) {
  return (
    <>
      <SiteHeader active={active} locale={locale} />
      <main className="flex-1">

      <section className="py-16 lg:py-20" style={{ background: 'var(--grad-deep)' }}>
        <div className="container-page">
          {/* `as="h1"`: este e o titulo principal da pagina. */}
          <SectionHeading as="h1" inverse eyebrow={eyebrow} title={title} lede={lede} />
        </div>
      </section>

      {/*
        `pt-16` em vez do `section-y` cheio no TOPO: o cabeçalho escuro logo
        acima já separa visualmente, e os 130px que o respiro de seção somava a
        ele abriam uma faixa vazia entre o título da página e o seu conteúdo. A
        base mantém o respiro inteiro, que é o que afasta o conteúdo do rodapé.
      */}
      {children && (
        <section className="pb-[var(--section-y)] pt-16 lg:pt-20">
          <div className="container-page max-w-[var(--layout-narrow)]">{children}</div>
        </section>
      )}
      </main>
    </>
  )
}
