'use client'

import { useEffect, useState } from 'react'
import { getDict } from '@/i18n/dictionary'
import type { Locale } from '@/i18n/config'

/**
 * Escolha de cookies, e o Consent Mode v2 que a respeita.
 *
 * ## Por que existe
 *
 * A política de privacidade do site já descreve quatro categorias de cookies e
 * fala em "acompanhar a eficiência das campanhas" — ou seja, promete uma
 * gestão de preferências. Enquanto não havia pixel nenhum isso era inofensivo.
 * No instante em que o Tag Manager entra, a promessa passa a descrever um
 * mecanismo que não existe, e aí a inconsistência é o próprio problema.
 *
 * A LGPD não tem o opt-in prévio do regime europeu, mas o Art. 8º exige
 * consentimento livre, informado, por finalidade específica e revogável com a
 * mesma facilidade com que foi dado. Legítimo interesse ainda se defende para
 * medição agregada; para remarketing, que é perfilamento publicitário, não.
 *
 * ## Como funciona
 *
 * O estado padrão é RECUSADO, escrito por um script que roda antes do Tag
 * Manager (ver `_shell.tsx`). O GTM carrega sempre, mas sem permissão para
 * gravar nada; quando a pessoa aceita, `gtag('consent','update')` libera as
 * categorias escolhidas e as tags que estavam esperando disparam.
 *
 * Aceitar e recusar têm o mesmo peso visual de propósito. "Aceitar todos" em
 * destaque com um "recusar" cinza escondido é o padrão que a ANPD já sinalizou
 * como consentimento viciado — e não é o que este estaleiro precisa.
 */

export const CHAVE_CONSENTIMENTO = 'coral_consentimento'

/** O que foi decidido, e quando. O Art. 8º §2º põe o ônus da prova no site. */
type Escolha = {
  estatisticas: boolean
  marketing: boolean
  em: string
  /* Versão do texto aceito: se a política mudar materialmente, dá para saber
     quem consentiu com qual redação. */
  versao: number
}

export const VERSAO_POLITICA = 1

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

/** Traduz a escolha para o vocabulário do Consent Mode v2. */
function aplicar(e: { estatisticas: boolean; marketing: boolean }) {
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer ?? []
  // A assinatura do gtag depende de `arguments`, então não dá para usar
  // arrow com parâmetros nomeados aqui.
  function gtag(...args: unknown[]) {
    window.dataLayer!.push(args)
  }
  gtag('consent', 'update', {
    analytics_storage: e.estatisticas ? 'granted' : 'denied',
    ad_storage: e.marketing ? 'granted' : 'denied',
    ad_user_data: e.marketing ? 'granted' : 'denied',
    ad_personalization: e.marketing ? 'granted' : 'denied',
  })
}

/** Lê a decisão já tomada nesta máquina, se houver. */
export function lerConsentimento(): Escolha | null {
  try {
    const cru = localStorage.getItem(CHAVE_CONSENTIMENTO)
    if (!cru) return null
    const e = JSON.parse(cru) as Escolha
    // Política nova invalida consentimento antigo: a pessoa aceitou outro texto.
    return e.versao === VERSAO_POLITICA ? e : null
  } catch {
    return null
  }
}

export default function Consentimento({ locale = 'pt' }: { locale?: Locale }) {
  const [aberto, setAberto] = useState(false)
  const t = getDict(locale).cookies

  useEffect(() => {
    /* O ouvinte do rodapé é registrado SEMPRE, antes de qualquer saída
       antecipada. Registrá-lo só quando o banner está aberto deixava o link
       "Preferências de cookies" inerte justamente para quem já decidiu — que
       é exatamente quem precisa dele para mudar de ideia. */
    const reabrir = () => setAberto(true)
    window.addEventListener('coral:abrir-consentimento', reabrir)
    const limpar = () => window.removeEventListener('coral:abrir-consentimento', reabrir)

    const salvo = lerConsentimento()
    if (salvo) {
      // Já decidiu: reaplica a escolha a cada visita, porque o estado padrão
      // do Consent Mode é sempre "negado" no carregamento.
      aplicar(salvo)
      return limpar
    }
    /* O lint alerta para `setState` em efeito, e a regra faz sentido em geral.
       Aqui e o padrao de "montado no cliente": a decisao mora no
       `localStorage`, que nao existe no servidor, entao o banner so pode
       aparecer depois da montagem. Ler no corpo do componente faria o HTML do
       servidor divergir do cliente e quebraria a hidratacao. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAberto(true)
    return limpar
  }, [])

  const decidir = (estatisticas: boolean, marketing: boolean) => {
    const escolha: Escolha = {
      estatisticas,
      marketing,
      // `toISOString` de um Date novo: o registro precisa do momento real.
      em: new Date().toISOString(),
      versao: VERSAO_POLITICA,
    }
    try {
      localStorage.setItem(CHAVE_CONSENTIMENTO, JSON.stringify(escolha))
    } catch {
      /* Storage bloqueado: a escolha vale para esta página, e o banner volta
         na próxima. Melhor perguntar de novo do que assumir consentimento. */
    }
    aplicar(escolha)
    setAberto(false)
  }

  if (!aberto) return null

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consentimento-titulo"
      /* `z-[130]`: acima dos diálogos (z-120), porque a escolha precede
         qualquer outra interação. Ancorado embaixo para não cobrir o conteúdo
         que a pessoa veio ler. */
      className="fixed inset-x-0 bottom-0 z-[130] border-t border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-lg)] print:hidden"
    >
      <div className="container-page flex flex-col gap-4 py-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <div className="max-w-[72ch]">
          <h2
            id="consentimento-titulo"
            className="font-display text-base font-semibold tracking-[var(--tracking-display)] text-[var(--text-strong)]"
          >
            {t.titulo}
          </h2>
          <p className="mt-1.5 text-sm leading-[1.6] text-[var(--color-text-body)]">
            {t.texto}{' '}
            <a
              href={locale === 'en' ? '/en/privacy-policy' : '/politica-de-privacidade'}
              className="font-semibold text-ocean-700 underline underline-offset-4 hover:text-aqua-600"
            >
              {t.link}
            </a>
          </p>
        </div>

        {/* Os dois botões com o mesmo tamanho e o mesmo peso. Recusar não é
            um link escondido: é uma escolha de igual valor. */}
        <div className="flex shrink-0 flex-wrap gap-3">
          <button
            type="button"
            onClick={() => decidir(false, false)}
            className="btn-press inline-flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-pill)] border border-[var(--border-strong)] px-6 font-body text-xs font-bold uppercase tracking-[var(--tracking-wide)] text-[var(--text-strong)] hover:border-ocean-700 hover:bg-[var(--surface-sunken)] lg:flex-none"
          >
            {t.recusar}
          </button>
          <button
            type="button"
            onClick={() => decidir(true, true)}
            className="btn-press inline-flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-pill)] bg-ocean-600 px-6 font-body text-xs font-bold uppercase tracking-[var(--tracking-wide)] text-pearl-0 shadow-[var(--shadow-sm)] hover:bg-ocean-500 active:bg-ocean-700 lg:flex-none"
          >
            {t.aceitar}
          </button>
        </div>
      </div>
    </div>
  )
}
