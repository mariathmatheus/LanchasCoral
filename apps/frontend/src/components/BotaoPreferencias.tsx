'use client'

import { getDict } from '@/i18n/dictionary'
import type { Locale } from '@/i18n/config'

/**
 * Reabre a escolha de cookies.
 *
 * O Art. 8º §5º da LGPD exige que o consentimento seja revogável com a mesma
 * facilidade com que foi dado. Sem este link, quem aceitasse uma vez não teria
 * como voltar atrás — e o banner, por desenho, não reaparece depois de uma
 * decisão tomada.
 *
 * Dispara um evento em vez de manipular estado compartilhado: o banner vive em
 * outra árvore do layout, e um evento de janela evita ter de erguer um contexto
 * só para ligar dois componentes que se encontram uma vez por visita.
 */
export default function BotaoPreferencias({ locale = 'pt' }: { locale?: Locale }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event('coral:abrir-consentimento'))}
      className="btn-press inline-flex min-h-11 items-center transition-colors hover:text-pearl-0"
    >
      {getDict(locale).cookies.preferencias}
    </button>
  )
}
