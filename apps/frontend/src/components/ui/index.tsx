import Link from 'next/link'
import Image from 'next/image'
import type { ComponentProps, ReactNode } from 'react'

/*
 * Coral Design System primitives.
 *
 * Ported from the CoralDesignSystem bundle (namespace CoralDesignSystem_57e1bd)
 * shipped in "Coral Website (offline).html". Sizes, tones and behaviours below
 * follow that source; the styling is expressed with the project's tokens.
 */

/* ------------------------------------------------------------------ Logo */

/**
 * The Coral mark. `white` is the reversed lockup for dark surfaces (header
 * over hero media, footer); `color` is the blue wordmark for light surfaces.
 */
export function Logo({
  variant = 'color',
  height = 30,
  className = '',
  priority = false,
}: {
  variant?: 'color' | 'white'
  height?: number
  className?: string
  priority?: boolean
}) {
  // Marca branca (sem o swoosh colorido), como na versão de referência.
  // Proporção do arquivo: 501 x 120.
  const white = variant === 'white'
  const ratio = white ? 501 / 120 : 869 / 182
  const width = Math.round(ratio * height)

  return (
    <Image
      src={white ? '/brand/logo-coral-mono.png' : '/brand/logo-coral.png'}
      alt="Lanchas Coral"
      width={width}
      height={height}
      priority={priority}
      className={`block h-auto w-auto ${className}`}
      style={{ height, width: 'auto' }}
    />
  )
}

/* ---------------------------------------------------------------- Button */

/*
 * Movimento do botao: ele AFUNDA quando pressionado, e nao sobe no hover.
 *
 * A versao anterior subia 2px sob o cursor (`hover:-translate-y-0.5`), que e o
 * oposto do que um botao fisico faz — botao apertado desce. Sob o dedo, no
 * celular, aquele movimento nem existia: `hover` nao dispara no toque, entao a
 * unica resposta ao toque era nenhuma.
 *
 * Agora o hover so muda cor, e `active` faz o que o gesto pede: 1px para baixo
 * com sombra interna, igual em mouse e em toque. `duration-75` no transform
 * porque afundar tem de ser imediato; a cor pode levar os 240ms de sempre.
 *
 * O movimento em si mora em `.btn-press`, no globals.css, porque vários botões
 * do site sao `<button>` de formulario que nunca passam por aqui (enviar,
 * buscar, o painel administrativo) — e as animacoes precisavam ser a MESMA.
 */
const BTN_BASE =
  'btn-press group/btn relative inline-flex items-center justify-center gap-2.5 overflow-hidden whitespace-nowrap rounded-[var(--radius-pill)] border font-body font-semibold uppercase tracking-[0.06em] disabled:opacity-40'

const BTN_SIZE = {
  sm: 'h-10 px-5 text-[11px]',
  md: 'h-12 px-7 text-xs',
  /* `px-6` até 380px: com os 36px fixos de `px-9`, "Explore nossos modelos"
     precisava de 283px numa coluna de 280 e saía cortado no iPhone SE.
     O texto não quebra (`whitespace-nowrap`), então quem cede é a folga. */
  lg: 'h-[58px] px-6 text-[13px] min-[380px]:px-9',
} as const

/*
 * Preenchimento CHAPADO, no azul da marca.
 *
 * O gradiente saiu: sobre a pilula ele lia como efeito, nao como cor — a peca
 * ficava com aparencia datada e, pior, a cor do botao mudava conforme a
 * largura do rotulo, entao dois botoes lado a lado nunca eram o mesmo azul.
 * Chapado, `primary` e `signature` sao a mesma familia em dois pesos: o
 * ocean-700 conduz, o ocean-600 mais claro assina a acao principal.
 *
 * `active:` completa o gesto que a base descreve — a sombra vira interna, como
 * a de uma tecla afundada, e o tom escurece um degrau.
 */
const BTN_VARIANT = {
  primary:
    'border-0 bg-ocean-700 text-pearl-0 shadow-[var(--shadow-sm)] hover:bg-ocean-600 active:bg-ocean-800',
  signature:
    'border-0 bg-ocean-600 text-pearl-0 shadow-[var(--shadow-sm)] hover:bg-ocean-500 active:bg-ocean-700',
  outline:
    'border-[var(--border-strong)] bg-transparent text-[var(--text-strong)] hover:border-ocean-700 hover:bg-pearl-100 active:bg-pearl-200',
  /* Sobre fundo escuro a sombra interna preta nao aparece; o afundar fica por
     conta do deslocamento e do fundo que acende um degrau a mais. */
  'outline-inverse':
    'border-white/45 bg-transparent text-pearl-0 hover:border-aqua-400 hover:bg-aqua-500/10 hover:text-white active:bg-aqua-500/20',
  ghost: 'border-0 bg-transparent px-2 text-ocean-700 hover:text-aqua-600',
} as const

type ButtonVariant = keyof typeof BTN_VARIANT
type ButtonSize = keyof typeof BTN_SIZE

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...props
}: ComponentProps<typeof Link> & {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}) {
  return (
    <Link
      {...props}
      className={`${BTN_BASE} ${BTN_SIZE[size]} ${BTN_VARIANT[variant]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
    >
      {children}
    </Link>
  )
}

/**
 * O mesmo botao, como `<button>` de formulario.
 *
 * `Button` e um `<Link>` — serve para navegar, nao para enviar. Os botoes de
 * envio do site (proposta, busca do estoque, painel) precisavam do mesmo
 * tamanho, da mesma cor e do mesmo movimento, e cada um repetia as classes
 * por conta propria: as tres copias divergiram. Aqui as duas formas leem do
 * MESMO `BTN_BASE`, `BTN_SIZE` e `BTN_VARIANT`.
 */
export function SubmitButton({
  variant = 'signature',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...props
}: ComponentProps<'button'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}) {
  return (
    /* `type="submit"` antes do spread: e o uso esperado deste componente, mas
       quem chama pode passar `type="button"` e sobrescrever. Sem o padrao, um
       botao dentro de <form> envia por acidente em alguns navegadores. */
    <button
      type="submit"
      {...props}
      className={`${BTN_BASE} ${BTN_SIZE[size]} ${BTN_VARIANT[variant]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------ IconButton */

const ICON_BTN_TONE = {
  /** Sobre superficie clara — fechar dialogo, acao discreta. */
  light:
    'text-[var(--text-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-strong)]',
  /** Sobre foto ou fundo escuro — controles da galeria. */
  dark: 'text-white/70 hover:bg-white/10 hover:text-white',
  /** Sobre a propria foto, com fundo proprio para destacar do conteudo. */
  overlay: 'bg-navy-900/45 text-pearl-0 backdrop-blur-sm hover:bg-navy-900/70',
} as const

/**
 * Botao que carrega so um icone.
 *
 * Existe como componente porque o site tem varios — fechar o pop-up, avancar
 * a galeria, ampliar, marcar para comparar — e cada um repetia o proprio
 * tamanho e a propria animacao, que divergiam entre si. Aqui o alvo de 44px
 * e o movimento de `.btn-press` valem para todos.
 *
 * `rotulo` vira `aria-label`: um botao sem texto precisa dele para o leitor
 * de tela anunciar o que faz.
 */
export function IconButton({
  rotulo,
  tone = 'light',
  className = '',
  children,
  ...props
}: ComponentProps<'button'> & {
  rotulo: string
  tone?: keyof typeof ICON_BTN_TONE
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      {...props}
      className={`btn-press inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[var(--radius-pill)] disabled:opacity-30 disabled:hover:bg-transparent ${ICON_BTN_TONE[tone]} ${className}`}
    >
      {children}
    </button>
  )
}

/* ----------------------------------------------------------------- Badge */

const BADGE_TONE = {
  ocean: 'bg-ocean-100 text-ocean-800 border-transparent',
  aqua: 'bg-aqua-100 text-aqua-600 border-transparent',
  /* Chapado como os botoes: o gradiente saiu do sistema, e a etiqueta ao lado
     de um botao azul chapado nao pode ser a unica peca degradê da tela. */
  lime: 'bg-ocean-600 text-pearl-0 border-0',
  navy: 'bg-navy-900 text-pearl-0 border-transparent',
  neutral: 'bg-pearl-100 text-[var(--color-text-body)] border-transparent',
  outline: 'bg-transparent text-[var(--text-muted)] border-[var(--border-subtle)]',
  'outline-inverse':
    'bg-transparent text-on-dark-muted border-[var(--border-on-dark)]',
} as const

export function Badge({
  tone = 'ocean',
  children,
  className = '',
}: {
  tone?: keyof typeof BADGE_TONE
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded-[var(--radius-pill)] border px-2.5 py-1 font-body text-[11px] font-bold uppercase leading-none tracking-[var(--tracking-eyebrow)] ${BADGE_TONE[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

/* ------------------------------------------------------------- Section UI */

/** Eyebrow + display headline + optional lede. The standard section opener. */
export function SectionHeading({
  eyebrow,
  title,
  lede,
  index,
  inverse = false,
  align = 'left',
  as: Tag = 'h2',
  className = '',
}: {
  eyebrow?: string
  title: ReactNode
  lede?: ReactNode
  /** Mono progress marker, e.g. "01 / 05". */
  index?: string
  inverse?: boolean
  align?: 'left' | 'center'
  /**
   * Nivel do heading. O titulo PRINCIPAL de uma pagina deve passar `h1`:
   * o padrao `h2` existe porque este componente tambem abre secoes internas.
   * Sem isso o documento inteiro comeca em h2 e o buscador perde o sinal
   * mais forte de assunto da pagina.
   */
  as?: 'h1' | 'h2' | 'h3'
  className?: string
}) {
  return (
    <div
      className={`${align === 'center' ? 'mx-auto max-w-[var(--layout-narrow)] text-center' : 'max-w-[760px]'} ${className}`}
    >
      {eyebrow && (
        <div
          className={`mb-4 flex items-center gap-3 ${align === 'center' ? 'justify-center' : ''}`}
        >
          <span
            aria-hidden
            className={`h-px w-7 ${inverse ? 'bg-aqua-500' : 'bg-ocean-700'}`}
          />
          <span
            className={`font-body text-[length:var(--text-eyebrow)] font-bold uppercase tracking-[var(--tracking-eyebrow)] ${
              inverse ? 'text-aqua-500' : 'text-ocean-700'
            }`}
          >
            {eyebrow}
          </span>
          {index && (
            <span
              className={`font-mono text-xs ${
                inverse ? 'text-on-dark-muted' : 'text-[var(--text-muted)]'
              }`}
            >
              {index}
            </span>
          )}
        </div>
      )}

      <Tag
        className={`m-0 font-display text-[length:var(--text-d2)] font-medium leading-[1.08] tracking-[var(--tracking-display)] text-balance ${
          inverse ? 'text-pearl-0' : 'text-[var(--text-strong)]'
        }`}
      >
        {title}
      </Tag>

      {lede && (
        <p
          className={`mt-5 max-w-[60ch] text-[17px] font-normal leading-[1.6] text-pretty ${
            inverse ? 'text-on-dark-soft' : 'text-[var(--color-text-body)]'
          }`}
        >
          {lede}
        </p>
      )}
    </div>
  )
}

/** A hairline that carries the aqua→lime wake gradient. */
export function WaveDivider({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`h-px w-full ${className}`}
      style={{ background: 'var(--wave-line)' }}
    />
  )
}

/* ------------------------------------------------------------------ Data */

export type SpecRow = { label: string; value: string | null; unit?: string | null }

/** Technical specification table — mono values, hairline rows, no zebra striping. */
export function SpecTable({
  rows,
  columns = 1,
  inverse = false,
  className = '',
}: {
  rows: SpecRow[]
  columns?: 1 | 2
  inverse?: boolean
  className?: string
}) {
  const filled = rows.filter((r) => r.value)
  if (filled.length === 0) return null

  const line = inverse ? 'border-[var(--border-on-dark)]' : 'border-[var(--border-subtle)]'

  return (
    <div
      className={`grid gap-x-14 ${columns === 2 ? 'sm:grid-cols-2' : 'grid-cols-1'} ${className}`}
    >
      {filled.map((r) => (
        <div
          key={r.label}
          className={`flex items-baseline justify-between gap-4 border-b py-3.5 ${line}`}
        >
          <span
            className={`font-body text-xs font-semibold uppercase tracking-[var(--tracking-wide)] ${
              inverse ? 'text-on-dark-muted' : 'text-[var(--text-muted)]'
            }`}
          >
            {r.label}
          </span>
          <span
            className={`text-right font-mono text-sm tracking-[var(--tracking-mono)] ${
              inverse ? 'text-pearl-0' : 'text-[var(--text-strong)]'
            }`}
          >
            {r.value}
            {r.unit && (
              <span
                className={`ml-1 ${
                  inverse ? 'text-on-dark-muted' : 'text-[var(--text-muted)]'
                }`}
              >
                {r.unit}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  )
}

/** A headline figure with a mono value and an uppercase caption. */
export function StatBlock({
  value,
  unit,
  label,
  inverse = false,
  size = 'md',
}: {
  value: ReactNode
  unit?: string | null
  label: string
  inverse?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const valueSize = {
    sm: 'text-xl',
    md: 'text-[length:var(--text-h1)]',
    lg: 'text-[length:var(--text-d2)]',
  }[size]

  return (
    <div>
      <div
        className={`font-display font-medium leading-[1.05] tracking-[var(--tracking-display)] ${valueSize} ${
          inverse ? 'text-pearl-0' : 'text-[var(--text-strong)]'
        }`}
      >
        {value}
        {unit && (
          <span
            className={`ml-1 font-mono text-sm font-normal ${
              inverse ? 'text-on-dark-muted' : 'text-[var(--text-muted)]'
            }`}
          >
            {unit}
          </span>
        )}
      </div>
      <div
        className={`mt-1.5 font-body text-[10px] font-bold uppercase tracking-[var(--tracking-eyebrow)] ${
          inverse ? 'text-on-dark-muted' : 'text-[var(--text-muted)]'
        }`}
      >
        {label}
      </div>
    </div>
  )
}

/** Right-pointing arrow used on cards and inline links. */
export function ArrowRight({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="square"
      aria-hidden
    >
      <path d="M5 12h13M12 5.5 18.5 12 12 18.5" />
    </svg>
  )
}

/** Underlined caps link — "All models", "Compare", "View gallery". */
export function TextLink({
  inverse = false,
  className = '',
  children,
  ...props
}: ComponentProps<typeof Link> & { inverse?: boolean }) {
  return (
    <Link
      {...props}
      className={`group inline-flex min-h-11 items-center gap-2 font-body text-xs font-bold uppercase tracking-[var(--tracking-wide)] transition-colors ${
        inverse ? 'text-aqua-500 hover:text-aqua-400' : 'text-ocean-700 hover:text-aqua-600'
      } ${className}`}
    >
      {children}
      <span className="transition-transform duration-[240ms] ease-[var(--ease-glide)] group-hover:translate-x-1">
        <ArrowRight size={16} />
      </span>
    </Link>
  )
}
