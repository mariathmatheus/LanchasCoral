'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { submitInquiry, type ContactState } from '@/app/(pt)/contato/actions'
import { lerAtribuicao } from '@/components/Atribuicao'
import { IconButton, SubmitButton } from '@/components/ui'
import { IconDownload } from '@/components/icons'
import { getDict } from '@/i18n/dictionary'
import type { Locale } from '@/i18n/config'

const FIELD =
  'w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3 text-[15px] text-[var(--text-strong)] outline-none transition-colors placeholder:text-[var(--color-pearl-400)] focus:border-ocean-600'

function Label({ htmlFor, children, required }: { htmlFor: string; children: string; required?: boolean }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block font-body text-[length:var(--text-eyebrow)] font-bold uppercase tracking-[var(--tracking-eyebrow)] text-[var(--text-muted)]"
    >
      {children}
      {required && <span className="text-danger-500"> *</span>}
    </label>
  )
}

function Err({ msgs }: { msgs?: string[] }) {
  if (!msgs?.length) return null
  return <p className="mt-1.5 text-[13px] text-danger-500">{msgs[0]}</p>
}

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <SubmitButton type="submit" size="lg" disabled={pending}>
      {pending ? pendingLabel : label}
    </SubmitButton>
  )
}

function ManualForm({
  boatSlug,
  manualUrl,
  locale,
  onSuccess,
}: {
  boatSlug: string
  manualUrl: string
  locale: Locale
  onSuccess: () => void
}) {
  const t = getDict(locale)
  const tf = t.form
  const tb = t.boat

  const [state, enviar] = useActionState<ContactState, FormData>(submitInquiry, {})

  const action = (dados: FormData) => {
    for (const [campo, valor] of Object.entries(lerAtribuicao())) {
      if (valor) dados.set(campo, valor)
    }
    return enviar(dados)
  }

  // Quando o lead é gravado com sucesso, dispara o download e avisa o pai.
  useEffect(() => {
    if (!state.ok) return
    const a = document.createElement('a')
    a.href = manualUrl
    a.download = ''
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    onSuccess()
  }, [state.ok, manualUrl, onSuccess])

  if (state.ok) {
    return (
      <div className="rounded-[var(--radius-md)] border border-success-500/30 bg-success-500/10 p-8">
        <p className="font-display text-xl font-medium text-[var(--text-strong)]">
          {tf.sentTitle}
        </p>
        <p className="mt-2 text-[15px] leading-[1.6] text-[var(--color-text-body)]">
          {tb.manualDownloading}
        </p>
      </div>
    )
  }

  return (
    <form action={action} className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <input type="hidden" name="boatSlug" value={boatSlug} />
      <input type="hidden" name="kind" value="MANUAL" />

      {/* Honeypot */}
      <div aria-hidden className="hidden">
        <label htmlFor="mdf-website">Website</label>
        <input id="mdf-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <Label htmlFor="mdf-name" required>{tf.name}</Label>
        <input id="mdf-name" name="name" required autoComplete="name" className={FIELD} placeholder={tf.namePlaceholder} />
        <Err msgs={state.errors?.name} />
      </div>

      <div>
        <Label htmlFor="mdf-email" required>{tf.email}</Label>
        <input id="mdf-email" name="email" type="email" required autoComplete="email" className={FIELD} placeholder="voce@exemplo.com" />
        <Err msgs={state.errors?.email} />
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor="mdf-phone">{tf.phone}</Label>
        <input id="mdf-phone" name="phone" type="tel" autoComplete="tel" className={FIELD} placeholder="(00) 00000-0000" />
        <Err msgs={state.errors?.phone} />
      </div>

      {state.message && !state.ok && (
        <p className="text-[14px] text-danger-500 sm:col-span-2">{state.message}</p>
      )}

      <div className="sm:col-span-2">
        <Submit label={tb.manualCta} pendingLabel={tf.sending} />
      </div>
    </form>
  )
}

/**
 * Botão que abre um modal de captura de lead antes de entregar o PDF.
 * O download só começa depois que o formulário é enviado com sucesso.
 */
export default function ManualDialog({
  locale,
  boatSlug,
  boatLabel,
  manualUrl,
  children,
}: {
  locale: Locale
  boatSlug: string
  boatLabel: string
  manualUrl: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [montado, setMontado] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const titleId = useId()

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMontado(true), [])

  const t = getDict(locale)

  useEffect(() => {
    if (!open) return

    triggerRef.current = document.activeElement as HTMLElement
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const alvos = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!alvos.length) return
      const first = alvos[0]
      const last = alvos[alvos.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    const id = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('input, textarea')?.focus()
    }, 60)

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      window.clearTimeout(id)
      triggerRef.current?.focus?.()
    }
  }, [open])

  return (
    <>
      <span
        className="contents"
        onClickCapture={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
      >
        {children}
      </span>

      {open &&
        montado &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-navy-900/80 p-4 backdrop-blur-sm sm:items-center sm:p-6"
            onClick={() => setOpen(false)}
          >
            <div
              ref={panelRef}
              onClick={(e) => e.stopPropagation()}
              className="my-auto w-full max-w-[640px] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-card)] shadow-[var(--shadow-lg)]"
            >
              <div className="flex items-start justify-between gap-6 px-7 pt-7 sm:px-9 sm:pt-9">
                <div>
                  <p className="font-body text-[length:var(--text-eyebrow)] font-bold uppercase tracking-[var(--tracking-eyebrow)] text-ocean-700">
                    {t.boat.manualCta}
                  </p>
                  <h2
                    id={titleId}
                    className="mt-2 font-display text-2xl font-semibold tracking-[var(--tracking-display)] text-[var(--text-strong)]"
                  >
                    {t.boat.manualDialogTitle}
                  </h2>
                  <p className="mt-2 text-[15px] leading-[1.6] text-[var(--color-text-body)]">
                    {boatLabel}
                  </p>
                </div>

                <IconButton
                  rotulo={t.boat.close}
                  onClick={() => setOpen(false)}
                  className="-mr-2 -mt-1"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </IconButton>
              </div>

              <div className="px-7 pb-9 pt-7 sm:px-9">
                <ManualForm
                  boatSlug={boatSlug}
                  manualUrl={manualUrl}
                  locale={locale}
                  onSuccess={() => {
                    // Mantém o modal aberto para mostrar a mensagem de sucesso
                    // por 2 s antes de fechar.
                    window.setTimeout(() => setOpen(false), 2000)
                  }}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
