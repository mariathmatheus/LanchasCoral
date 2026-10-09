'use client'

import { useEffect, useRef, useState } from 'react'
import { getDict } from '@/i18n/dictionary'
import type { Locale } from '@/i18n/config'

/**
 * Compartilhar a página de um modelo ou de um anúncio do Broker.
 *
 * No celular abre a folha nativa do sistema (`navigator.share`), que já traz
 * WhatsApp, Instagram e o resto do que a pessoa tem instalado. No desktop,
 * onde essa API quase não existe, cai num menu próprio com WhatsApp, e-mail e
 * copiar link.
 *
 * A URL vem do próprio navegador em vez de ser montada no servidor: assim o
 * link compartilhado é exatamente o que a pessoa está vendo, com o idioma
 * certo — e o componente não precisa saber o domínio de produção.
 */
export default function ShareButton({
  locale,
  titulo,
  inverse = false,
  className = '',
}: {
  locale: Locale
  /** Nome do barco, usado no texto da mensagem. */
  titulo: string
  /** Sobre fundo escuro. */
  inverse?: boolean
  className?: string
}) {
  const t = getDict(locale).compartilhar
  const [menu, setMenu] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  /* Fecha ao clicar fora ou apertar Esc — um menu que só fecha no próprio
     gatilho deixa a pessoa presa quando ela já mudou de ideia. */
  useEffect(() => {
    if (!menu) return
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setMenu(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [menu])

  /* A confirmação de "copiado" volta ao normal sozinha. O timer é limpo na
     desmontagem para não chamar setState num componente que já saiu. */
  useEffect(() => {
    if (!copiado) return
    const id = window.setTimeout(() => setCopiado(false), 2200)
    return () => window.clearTimeout(id)
  }, [copiado])

  const url = () => (typeof window === 'undefined' ? '' : window.location.href)

  const abrir = async () => {
    const link = url()
    /* `navigator.share` só existe em contexto seguro e, no desktop, quase
       nunca. Quando existe, é sempre a melhor experiência: é a folha que a
       pessoa já conhece do sistema. */
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: titulo, url: link })
        return
      } catch {
        /* A pessoa fechou a folha nativa. Não é erro: não abrimos o menu
           por cima, senão cancelar viraria um segundo menu na cara dela. */
        return
      }
    }
    setMenu((v) => !v)
  }

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url())
      setCopiado(true)
    } catch {
      /* Clipboard bloqueado (permissão negada, http sem TLS). Sem confirmação
         falsa: o menu segue aberto com WhatsApp e e-mail ainda utilizáveis. */
    }
  }

  const cor = inverse
    ? 'text-on-dark-muted hover:text-pearl-0'
    : 'text-[var(--text-muted)] hover:text-ocean-700'

  const itemCor = inverse
    ? 'text-pearl-0 hover:bg-white/8'
    : 'text-[var(--text-strong)] hover:bg-[var(--surface-sunken)]'

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={abrir}
        aria-expanded={menu}
        aria-haspopup="menu"
        className={`inline-flex min-h-11 items-center gap-2 font-body text-xs font-bold uppercase tracking-[var(--tracking-wide)] transition-colors ${cor}`}
      >
        <IconShare />
        {copiado ? t.copied : t.label}
      </button>

      {menu && (
        <div
          role="menu"
          className={`absolute bottom-full left-0 z-30 mb-2 w-56 overflow-hidden rounded-[var(--radius-sm)] border shadow-[var(--shadow-lg)] ${
            inverse
              ? 'border-[var(--border-on-dark)] bg-navy-800'
              : 'border-[var(--border-subtle)] bg-[var(--surface-card)]'
          }`}
        >
          <a
            role="menuitem"
            href={`https://wa.me/?text=${encodeURIComponent(`${titulo} — ${url()}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenu(false)}
            className={`flex min-h-11 items-center gap-3 px-4 text-sm transition-colors ${itemCor}`}
          >
            <IconWhatsApp />
            {t.whatsapp}
          </a>
          <a
            role="menuitem"
            href={`mailto:?subject=${encodeURIComponent(titulo)}&body=${encodeURIComponent(url())}`}
            onClick={() => setMenu(false)}
            className={`flex min-h-11 items-center gap-3 px-4 text-sm transition-colors ${itemCor}`}
          >
            <IconMail />
            {t.email}
          </a>
          <button
            role="menuitem"
            type="button"
            onClick={copiar}
            className={`flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm transition-colors ${itemCor}`}
          >
            <IconLink />
            {copiado ? t.copied : t.copy}
          </button>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ Ícones */

const traco = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

const IconShare = () => (
  <svg {...traco}>
    <circle cx="18" cy="5" r="2.6" />
    <circle cx="6" cy="12" r="2.6" />
    <circle cx="18" cy="19" r="2.6" />
    <path d="M8.3 10.8 15.7 6.5M8.3 13.2l7.4 4.3" />
  </svg>
)

const IconLink = () => (
  <svg {...traco}>
    <path d="M10 13.5a3.5 3.5 0 0 0 5 0l3-3a3.54 3.54 0 0 0-5-5l-1.5 1.5" />
    <path d="M14 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.54 3.54 0 0 0 5 5l1.5-1.5" />
  </svg>
)

const IconMail = () => (
  <svg {...traco}>
    <rect x="2.5" y="5" width="19" height="14" rx="2" />
    <path d="m3 6.5 9 6 9-6" />
  </svg>
)

/* Glifo cheio: o WhatsApp é reconhecido pela silhueta, e em traço de 1.6
   o balão com o fone dentro vira um borrão nos 16px do menu. */
const IconWhatsApp = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.48 1.34 5L2 22l5.16-1.35a9.9 9.9 0 0 0 4.88 1.27h.01c5.5 0 9.96-4.46 9.96-9.96A9.9 9.9 0 0 0 19.1 4.9 9.9 9.9 0 0 0 12.04 2Zm0 1.83c2.17 0 4.2.85 5.74 2.38a8.07 8.07 0 0 1 2.38 5.75c0 4.48-3.64 8.13-8.13 8.13a8.2 8.2 0 0 1-4.15-1.14l-.3-.18-3.06.8.82-2.99-.2-.31a8.1 8.1 0 0 1-1.24-4.31c0-4.49 3.65-8.13 8.14-8.13Zm-3.1 4.3c-.15 0-.39.06-.6.28-.2.22-.79.77-.79 1.88s.81 2.18.92 2.33c.12.15 1.6 2.44 3.87 3.42.54.23.96.37 1.29.48.54.17 1.03.15 1.42.09.43-.07 1.34-.55 1.53-1.08.19-.53.19-.98.13-1.08-.05-.09-.2-.15-.42-.26-.22-.11-1.34-.66-1.54-.73-.21-.08-.36-.12-.51.11-.15.22-.58.73-.71.88-.13.15-.26.17-.48.06-.22-.11-.95-.35-1.8-1.11a6.8 6.8 0 0 1-1.25-1.55c-.13-.23-.02-.35.1-.46.1-.1.22-.26.33-.39.11-.13.15-.22.22-.37.08-.15.04-.28-.02-.39-.06-.11-.5-1.23-.7-1.68-.18-.44-.37-.38-.5-.39l-.44-.01Z" />
  </svg>
)
