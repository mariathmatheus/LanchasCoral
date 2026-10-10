import { getZapComercial } from '@/lib/contatos'
import { getDict } from '@/i18n/dictionary'
import type { Locale } from '@/i18n/config'

/**
 * Botão flutuante de WhatsApp, fixo no canto inferior direito.
 *
 * Vai para o COMERCIAL: quem clica está comprando, não pedindo assistência.
 * O número sai de `getZapComercial()`, que prefere o campo do painel e cai no
 * celular do comercial enquanto ele não for preenchido.
 *
 * É Server Component de propósito — um link não precisa de JavaScript no
 * cliente, e este aparece em todas as páginas do site. A mensagem já vai
 * escrita, então o consultor sabe de onde veio o contato antes de responder.
 *
 * Não aparece no painel administrativo (ver `_shell.tsx`) nem quando não há
 * número utilizável.
 */
export default async function BotaoZap({ locale }: { locale: Locale }) {
  const numero = await getZapComercial()
  if (!numero) return null

  const t = getDict(locale).zap
  const href = `https://wa.me/${numero}?text=${encodeURIComponent(t.message)}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t.label}
      data-zap
      /*
        `bottom-5 right-5` e z-40: abaixo do cabeçalho fixo (z-50) e dos
        diálogos (z-110+), para não flutuar por cima de um pop-up aberto.

        `print:hidden` porque um botão flutuante impresso é só uma mancha
        verde sobre o texto.
      */
      className="btn-press group fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[var(--shadow-md)] hover:bg-[#1FB855] print:hidden"
    >
      {/* O rótulo só existe para leitor de tela: na tela, o glifo do WhatsApp
          já é reconhecido sem texto ao lado. */}
      <span className="sr-only">{t.label}</span>
      <IconWhatsApp />
    </a>
  )
}

/* Glifo cheio: em traço fino o balão com o fone dentro vira borrão nos 28px. */
const IconWhatsApp = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.48 1.34 5L2 22l5.16-1.35a9.9 9.9 0 0 0 4.88 1.27h.01c5.5 0 9.96-4.46 9.96-9.96A9.9 9.9 0 0 0 19.1 4.9 9.9 9.9 0 0 0 12.04 2Zm0 1.83c2.17 0 4.2.85 5.74 2.38a8.07 8.07 0 0 1 2.38 5.75c0 4.48-3.64 8.13-8.13 8.13a8.2 8.2 0 0 1-4.15-1.14l-.3-.18-3.06.8.82-2.99-.2-.31a8.1 8.1 0 0 1-1.24-4.31c0-4.49 3.65-8.13 8.14-8.13Zm-3.1 4.3c-.15 0-.39.06-.6.28-.2.22-.79.77-.79 1.88s.81 2.18.92 2.33c.12.15 1.6 2.44 3.87 3.42.54.23.96.37 1.29.48.54.17 1.03.15 1.42.09.43-.07 1.34-.55 1.53-1.08.19-.53.19-.98.13-1.08-.05-.09-.2-.15-.42-.26-.22-.11-1.34-.66-1.54-.73-.21-.08-.36-.12-.51.11-.15.22-.58.73-.71.88-.13.15-.26.17-.48.06-.22-.11-.95-.35-1.8-1.11a6.8 6.8 0 0 1-1.25-1.55c-.13-.23-.02-.35.1-.46.1-.1.22-.26.33-.39.11-.13.15-.22.22-.37.08-.15.04-.28-.02-.39-.06-.11-.5-1.23-.7-1.68-.18-.44-.37-.38-.5-.39l-.44-.01Z" />
  </svg>
)
