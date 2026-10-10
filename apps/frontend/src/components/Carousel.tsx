'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * Trilho horizontal com scroll-snap: setas e indicadores controlam a
 * "página" visível. Usa scroll nativo, então funciona com toque e teclado
 * mesmo antes do JS carregar — as setas apenas enriquecem.
 */
export default function Carousel({
  children,
  label,
  className = '',
}: {
  children: ReactNode[]
  label: string
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)
  const [pages, setPages] = useState(1)

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    const total = Math.max(1, Math.round(el.scrollWidth / el.clientWidth))
    setPages(total)
    setPage(Math.round(el.scrollLeft / el.clientWidth))
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    measure()
    const onScroll = () => setPage(Math.round(el.scrollLeft / el.clientWidth))
    el.addEventListener('scroll', onScroll, { passive: true })
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', onScroll)
      ro.disconnect()
    }
  }, [measure])

  const go = (dir: number) => {
    const el = ref.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' })
  }

  const toPage = (i: number) => {
    const el = ref.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  const atStart = page <= 0
  const atEnd = page >= pages - 1

  const arrow =
    'flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-[240ms] ease-[var(--ease-glide)] disabled:cursor-not-allowed disabled:opacity-30'

  return (
    <div className={className}>
      <div
        ref={ref}
        role="region"
        aria-label={label}
        tabIndex={0}
        /* `scroll-pl-1` casa com o `px-1`: sem ele, o primeiro cartao comeca a
           4px da borda de rolagem, o `snap-mandatory` considera isso fora do
           ponto de encaixe e o navegador corrige para `scrollLeft: 4` assim que
           mede o conteudo.
           
           Esse ajuste de 4px gera um evento de scroll real, que o Chrome conta
           como interacao do usuario — e a primeira interacao ENCERRA a medicao
           de Largest Contentful Paint. Medido: o evento chegava aos 186ms, 23ms
           depois da primeira pintura, e o Lighthouse reportava `NO_LCP` na home
           inteira. Em `/sobre`, que nao tem carrossel, o LCP aparecia normal.
           
           Com o `scroll-pl-1` o scroll some e o LCP volta a ser medido. */
        className="-mx-1 flex snap-x snap-mandatory items-stretch gap-6 overflow-x-auto scroll-smooth scroll-pl-1 px-1 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children.map((child, i) => (
          <div
            key={i}
            className="h-auto w-[calc(100%-0.5rem)] shrink-0 snap-start sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] xl:w-[calc(25%-1.125rem)]"
          >
            {child}
          </div>
        ))}
      </div>

      {pages > 1 && (
        <div className="mt-8 flex items-center justify-between gap-3 sm:gap-6">
          {/* ## Pontos ou contador, conforme couber
          
              Cada ponto tem 44px de alvo — o minimo das WCAG para o dedo —
              entao seis paginas pedem 304px so de indicadores. Num celular de
              360px, onde sobram 210px, nao cabe.
          
              A tentativa anterior foi `overflow-hidden`: as setas ficavam
              visiveis e os pontos excedentes eram cortados. Protegeu o controle
              errado. Medido: em 320px os pontos 4, 5 e 6 sumiam, e em TODOS os
              celulares pelo menos o ultimo ficava inalcancavel — um controle
              que existe no DOM, responde a leitor de tela e nao pode ser
              tocado e pior que controle nenhum.
          
              Acima de quatro paginas, os pontos dao lugar a um contador. Ele
              informa a mesma coisa — onde estou, quantas ha — em 60px, e quem
              navega usa as setas, que e o que o dedo alcanca de qualquer forma.
          
              O `aria-live` anuncia a mudanca para quem usa leitor de tela, que
              antes recebia isso pelos `aria-selected` dos pontos. */}
          {pages <= 4 ? (
            <div className="flex items-center gap-2" role="tablist" aria-label={label}>
              {Array.from({ length: pages }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === page}
                  aria-label={`${i + 1} / ${pages}`}
                  onClick={() => toPage(i)}
                  // O botao tem 44px de alvo com padding transparente; o traco
                  // visual continua com 6px. Sem isso o alvo real era 6x6px.
                  // `min-w-11`: com `px-2` o ponto inativo (6px) dava 22px de
                  // largura — alto o bastante, mas estreito demais para o dedo.
                  className="group flex h-11 min-w-11 items-center justify-center px-2"
                >
                  <span
                    className={`block h-1.5 rounded-full transition-all duration-[240ms] ease-[var(--ease-glide)] ${
                      i === page
                        ? 'w-7 bg-ocean-700'
                        : 'w-1.5 bg-[var(--border-strong)] group-hover:bg-[var(--text-muted)]'
                    }`}
                  />
                </button>
              ))}
            </div>
          ) : (
            <p
              aria-live="polite"
              aria-label={`${label}: ${page + 1} de ${pages}`}
              className="flex h-11 shrink-0 items-center font-mono text-xs tabular-nums text-[var(--text-muted)]"
            >
              <span className="font-bold text-[var(--text-strong)]">{page + 1}</span>
              <span className="px-1">/</span>
              {pages}
            </p>
          )}

          <div className="flex shrink-0 gap-2.5">
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={atStart}
              aria-label="Anterior"
              className={`${arrow} border-[var(--border-strong)] text-[var(--text-strong)] hover:border-ocean-700 hover:text-ocean-700`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path d="M15 6 9 12l6 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={atEnd}
              aria-label="Próximo"
              className={`${arrow} border-transparent bg-navy-900 text-pearl-0 hover:bg-ocean-700`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
