'use client'

import { useEffect } from 'react'

/**
 * Guarda de onde veio a visita, para que o lead chegue com a origem.
 *
 * O problema que isto resolve: as UTMs vivem na query string da PRIMEIRA
 * página aberta. Quem cai em `/modelos/coral-40?utm_source=google&gclid=...`,
 * navega até o formulário e só então preenche, chega ao servidor sem nada —
 * a query ficou para trás na navegação. Sem isso, um lead que custou R$ 80 de
 * clique é indistinguível de um que veio sozinho pela busca.
 *
 * ## Primeiro toque, não o último
 *
 * A origem é gravada UMA vez por sessão e nunca sobrescrita. Comprar uma
 * lancha leva semanas e várias visitas; se o último toque vencesse, todo lead
 * acabaria creditado à busca pelo nome da marca — que é justamente o tráfego
 * que não precisava ser comprado. O primeiro toque credita quem trouxe a
 * pessoa pela primeira vez.
 *
 * ## Por que sessionStorage e não cookie
 *
 * Isto não é rastreamento entre sites: é um campo de formulário que o próprio
 * visitante vai enviar, junto com o nome e o telefone que ele digitou. Fica na
 * aba, morre quando ela fecha, não é lido por terceiro e não exige
 * consentimento de cookie para funcionar. Um cookie de 90 dias daria
 * atribuição melhor, mas aí entra no escopo do banner — decisão de quem define
 * a política, não deste componente.
 */

export const CHAVE_ATRIBUICAO = 'coral_atribuicao'

/** O que vale guardar. Nomes iguais aos das colunas em `Inquiry`. */
export type Atribuicao = {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmTerm?: string
  utmContent?: string
  gclid?: string
  fbclid?: string
  referrer?: string
  landingPath?: string
}

/* O banco guarda TEXT, mas o valor vem da barra de endereços e pode ser
   qualquer coisa. 200 é folgado para uma campanha real e curto o bastante
   para que ninguém use o campo como depósito. */
const LIMITE = 200
const corta = (v: string | null) => (v ? v.slice(0, LIMITE) : undefined)

/** Lê o que foi guardado. Devolve `{}` quando não há nada ou o acesso falha. */
export function lerAtribuicao(): Atribuicao {
  try {
    const cru = sessionStorage.getItem(CHAVE_ATRIBUICAO)
    return cru ? (JSON.parse(cru) as Atribuicao) : {}
  } catch {
    /* Aba anônima, storage bloqueado ou JSON corrompido. O formulário segue
       funcionando sem a origem: perder a atribuição não pode perder o lead. */
    return {}
  }
}

export default function Atribuicao() {
  useEffect(() => {
    try {
      // Primeiro toque vence: se já há registro nesta sessão, não toca.
      if (sessionStorage.getItem(CHAVE_ATRIBUICAO)) return

      const q = new URLSearchParams(window.location.search)
      const ref = document.referrer

      /* Mesma origem não é "quem trouxe": é a página anterior do próprio site.
         Guardar isso encheria o campo de `coral.nerdresolve.com`. */
      let externo: string | undefined
      if (ref) {
        try {
          if (new URL(ref).host !== window.location.host) externo = ref.slice(0, LIMITE)
        } catch {
          /* Referrer malformado: ignora. */
        }
      }

      const dados: Atribuicao = {
        utmSource: corta(q.get('utm_source')),
        utmMedium: corta(q.get('utm_medium')),
        utmCampaign: corta(q.get('utm_campaign')),
        utmTerm: corta(q.get('utm_term')),
        utmContent: corta(q.get('utm_content')),
        // Valem mais que as UTMs: sobrevivem a redirecionamento e são o que
        // Google e Meta usam para casar a conversão com o anúncio exato.
        gclid: corta(q.get('gclid')),
        fbclid: corta(q.get('fbclid')),
        referrer: externo,
        landingPath: window.location.pathname.slice(0, LIMITE),
      }

      /* Visita direta sem nenhum sinal: gravar só o caminho de entrada não
         ajuda ninguém e ocuparia a sessão impedindo uma campanha real de ser
         registrada numa aba reaproveitada. */
      const temSinal = Object.entries(dados).some(([k, v]) => k !== 'landingPath' && v)
      if (!temSinal) return

      sessionStorage.setItem(CHAVE_ATRIBUICAO, JSON.stringify(dados))
    } catch {
      /* Storage indisponível. Silencioso de propósito: isto é instrumentação,
         e instrumentação quebrada não pode aparecer para o visitante. */
    }
  }, [])

  return null
}
