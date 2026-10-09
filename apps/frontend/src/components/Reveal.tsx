'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * Animação de entrada discreta: o bloco entra deslizando alguns pixels e
 * ganha opacidade quando chega à viewport.
 *
 * Escolhas feitas de propósito, pensando em SEO e peso:
 *  - o conteúdo é renderizado no servidor e já vem no HTML — a animação só
 *    altera `opacity`/`transform`, então nada fica oculto para o buscador;
 *  - sem biblioteca: um IntersectionObserver e duas classes;
 *  - anima uma única vez e desconecta o observer em seguida;
 *  - respeita `prefers-reduced-motion`, aparecendo direto no estado final.
 */

/**
 * De onde o bloco entra. `up` é o padrão e serve para quase tudo; as laterais
 * existem para conteúdo que já vive lado a lado — texto à esquerda e foto à
 * direita entrando cada um do seu lado reforça a leitura da composição, em vez
 * de dois blocos subindo juntos.
 */
type Direcao = 'up' | 'left' | 'right' | 'none'

/* Deslocamento inicial por direção. Mantido curto de propósito: o movimento
   deve ser percebido como assentar, não como o elemento viajando pela tela. */
const DE: Record<Direcao, string> = {
  up: 'translate-y-4',
  left: '-translate-x-6',
  right: 'translate-x-6',
  none: '',
}

export default function Reveal({
  children,
  delay = 0,
  from = 'up',
  as: Tag = 'div',
  className = '',
  esticar = true,
}: {
  children: ReactNode
  /** Atraso em ms, para escalonar itens de uma mesma linha. */
  delay?: number
  from?: Direcao
  as?: 'div' | 'section' | 'li'
  className?: string
  /**
   * `h-full`, para que cartoes lado a lado numa grade fiquem da mesma altura.
   * Desligue num bloco solto, onde herdar altura so cria espaco morto.
   */
  esticar?: boolean
}) {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setVisible(true)
        io.disconnect()
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    )

    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag
      ref={ref as never}
      data-reveal
      className={`${esticar ? 'h-full' : ''} motion-safe:transition-[opacity,transform] motion-safe:duration-[620ms] motion-safe:ease-[var(--ease-glide)] ${
        visible
          ? 'opacity-100 translate-x-0 translate-y-0'
          : `opacity-0 ${DE[from]} motion-reduce:opacity-100 motion-reduce:translate-x-0 motion-reduce:translate-y-0`
      } ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : undefined }}
    >
      {children}
    </Tag>
  )
}
