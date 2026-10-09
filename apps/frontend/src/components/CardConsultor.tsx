import { getComercial } from '@/lib/contatos'
import { CAIXAS } from '@/lib/email/destinos'
import { getDict } from '@/i18n/dictionary'
import type { Locale } from '@/i18n/config'

/** Só dígitos, para montar `tel:` a partir do número formatado. */
const soDigitos = (t: string) => t.replace(/\D/g, '')

/**
 * Quem atende quem está comprando — telefone e e-mail do comercial, ao lado
 * da ficha do anúncio.
 *
 * O formulário já existe no pop-up de proposta, mas parte dos compradores não
 * quer preencher formulário nenhum: quer ligar. Sem este bloco, a única saída
 * da página era o formulário.
 *
 * Os dados vêm do ponto focal `comercial`, o mesmo que o painel edita e que
 * /contatos publica — trocar o número num lugar muda em todos.
 */
export default async function CardConsultor({
  locale,
  inverse = false,
  embutido = false,
  className = '',
}: {
  locale: Locale
  /** Sobre fundo escuro. */
  inverse?: boolean
  /**
   * Dentro de outro cartão (a ficha do anúncio). Sem moldura própria: quem
   * desenha a borda é o cartão de fora, e duas molduras aninhadas leem como
   * dois blocos separados — justamente o que juntá-los queria evitar.
   */
  embutido?: boolean
  className?: string
}) {
  const comercial = await getComercial()
  if (!comercial) return null

  const t = getDict(locale).consultor
  /* O e-mail do setor é estrutura de atendimento (`destinos.ts`), então serve
     de reserva quando o painel ainda não gravou um endereço no ponto focal. */
  const email = comercial.email || CAIXAS.comercial
  const titulo = (locale === 'en' ? comercial.labelEn : comercial.label) || t.role
  /* Celular na frente do fixo. O comercial publica os dois, e `phones[0]` traz
     o fixo — mas quem está olhando um anúncio quer o número que também atende
     no WhatsApp. Um celular do DDD 21 tem 9 dígitos após o DDD. */
  const celular = comercial.phones.find((p) => soDigitos(p).length === 11)
  const telefone = celular ?? comercial.phones[0] ?? null

  const linkCor = inverse
    ? 'text-aqua-400 hover:text-aqua-500'
    : 'text-ocean-700 hover:text-aqua-600'

  return (
    <div
      className={`${
        embutido
          ? ''
          : `rounded-[var(--radius-md)] border p-7 ${
              inverse
                ? 'border-[var(--border-on-dark)] bg-white/[0.04]'
                : 'border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)]'
            }`
      } ${className}`}
    >
      {!embutido && (
        <h2
          className={`font-body text-[length:var(--text-eyebrow)] font-bold uppercase tracking-[var(--tracking-eyebrow)] ${
            inverse ? 'text-aqua-500' : 'text-ocean-700'
          }`}
        >
          {t.title}
        </h2>
      )}

      <div className={`flex items-start gap-4 ${embutido ? '' : 'mt-5'}`}>
        <span
          aria-hidden
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            inverse ? 'bg-white/8 text-aqua-400' : 'bg-[var(--surface-sunken)] text-ocean-700'
          }`}
        >
          <IconConsultor />
        </span>

        <div className="min-w-0">
          <p
            className={`font-display text-[17px] font-semibold tracking-[var(--tracking-display)] ${
              inverse ? 'text-pearl-0' : 'text-[var(--text-strong)]'
            }`}
          >
            {titulo}
          </p>

          {/* `break-all` no e-mail: endereços longos estouravam a coluna
              estreita ao lado da ficha em telas de 360px. */}
          <div className="mt-2.5 flex flex-col gap-1.5">
            {telefone && (
              <a
                href={`tel:+55${soDigitos(telefone)}`}
                className={`inline-flex min-h-11 items-center gap-2.5 font-mono text-[15px] underline-offset-4 transition-colors hover:underline ${linkCor}`}
              >
                <IconPhone />
                {telefone}
              </a>
            )}
            <a
              href={`mailto:${email}`}
              className={`inline-flex min-h-11 items-center gap-2.5 break-all text-[15px] underline-offset-4 transition-colors hover:underline ${linkCor}`}
            >
              <IconMail />
              {email}
            </a>
            {comercial.whatsapp && (
              <a
                href={`https://wa.me/${comercial.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex min-h-11 items-center gap-2.5 text-sm font-semibold underline-offset-4 transition-colors hover:underline ${linkCor}`}
              >
                <IconWhatsApp />
                {t.whatsapp}
              </a>
            )}
          </div>

          {comercial.hours && (
            <p
              className={`mt-3 font-mono text-xs ${
                inverse ? 'text-on-dark-muted' : 'text-[var(--text-muted)]'
              }`}
            >
              {(locale === 'en' ? comercial.hoursEn : comercial.hours) || comercial.hours}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ Ícones */

const traco = {
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

const IconConsultor = () => (
  <svg width="22" height="22" {...traco}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
  </svg>
)

const IconPhone = () => (
  <svg width="15" height="15" {...traco}>
    <path d="M6.2 3.5h3l1.5 3.7-1.9 1.1a11 11 0 0 0 4.9 4.9l1.1-1.9 3.7 1.5v3a1.8 1.8 0 0 1-2 1.8A15.6 15.6 0 0 1 4.4 5.5a1.8 1.8 0 0 1 1.8-2Z" />
  </svg>
)

const IconMail = () => (
  <svg width="15" height="15" {...traco}>
    <rect x="2.5" y="5" width="19" height="14" rx="2" />
    <path d="m3 6.5 9 6 9-6" />
  </svg>
)

const IconWhatsApp = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.48 1.34 5L2 22l5.16-1.35a9.9 9.9 0 0 0 4.88 1.27h.01c5.5 0 9.96-4.46 9.96-9.96A9.9 9.9 0 0 0 19.1 4.9 9.9 9.9 0 0 0 12.04 2Zm0 1.83c2.17 0 4.2.85 5.74 2.38a8.07 8.07 0 0 1 2.38 5.75c0 4.48-3.64 8.13-8.13 8.13a8.2 8.2 0 0 1-4.15-1.14l-.3-.18-3.06.8.82-2.99-.2-.31a8.1 8.1 0 0 1-1.24-4.31c0-4.49 3.65-8.13 8.14-8.13Zm-3.1 4.3c-.15 0-.39.06-.6.28-.2.22-.79.77-.79 1.88s.81 2.18.92 2.33c.12.15 1.6 2.44 3.87 3.42.54.23.96.37 1.29.48.54.17 1.03.15 1.42.09.43-.07 1.34-.55 1.53-1.08.19-.53.19-.98.13-1.08-.05-.09-.2-.15-.42-.26-.22-.11-1.34-.66-1.54-.73-.21-.08-.36-.12-.51.11-.15.22-.58.73-.71.88-.13.15-.26.17-.48.06-.22-.11-.95-.35-1.8-1.11a6.8 6.8 0 0 1-1.25-1.55c-.13-.23-.02-.35.1-.46.1-.1.22-.26.33-.39.11-.13.15-.22.22-.37.08-.15.04-.28-.02-.39-.06-.11-.5-1.23-.7-1.68-.18-.44-.37-.38-.5-.39l-.44-.01Z" />
  </svg>
)
