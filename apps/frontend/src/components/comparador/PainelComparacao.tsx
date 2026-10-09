'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import CabecalhoLado from './CabecalhoLado'
import { IconButton } from '@/components/ui'
import LinhasComparacao from './LinhasComparacao'
import { type OpcaoModelo } from './TrocarModelo'
import { getDict } from '@/i18n/dictionary'
import { type Locale } from '@/i18n/config'
import type { GrupoComparacao, Caracteristicas } from '@/lib/comparar'

/**
 * Comparação numa caixa sobreposta à página atual.
 *
 * Painel e não navegação: o visitante compara e volta exatamente para onde
 * estava. Mandar para outra rota perderia a lista que ele percorria e a
 * altura em que parou.
 *
 * ## O que dá para fazer sem sair daqui
 *
 * Trocar qualquer um dos dois modelos, ver outras fotos de cada um, esconder
 * as linhas iguais, abrir a ficha completa e pedir proposta. A primeira
 * versão era uma tabela estática de duas telas de rolagem: quem quisesse
 * olhar um terceiro modelo tinha de fechar, desmarcar, escolher e reabrir.
 */

type Lado = {
  slug: string
  rotulo: string
  descricao: string | null
  foto: string | null
  fotos: string[]
}

type Dados = {
  a: Lado
  b: Lado
  grupos: GrupoComparacao[]
  caracteristicas: Caracteristicas
}

export default function PainelComparacao({
  slugs,
  locale = 'pt',
  aoFechar,
}: {
  slugs: [string, string]
  locale?: Locale
  aoFechar: () => void
}) {
  const t = getDict(locale).compare

  /* Os slugs viram estado local: trocar um modelo aqui dentro precisa
     atualizar a tabela sem fechar o painel. A escolha é espelhada de volta
     no contexto, para a barra do rodapé acompanhar. */
  const [par, setPar] = useState<[string, string]>(slugs)
  /* Um estado só para a busca, em vez de três sincronizados por efeito:
     `dados` guarda o último resultado bom, e `carregandoPar` diz qual par
     está em voo. Assim a tabela anterior continua visível durante a troca,
     e não há `setState` no corpo do efeito. */
  const [dados, setDados] = useState<Dados | null>(null)
  const [erro, setErro] = useState(false)
  const [carregandoPar, setCarregandoPar] = useState<string | null>(null)
  const [opcoes, setOpcoes] = useState<OpcaoModelo[]>([])

  const chave = `${par[0]}|${par[1]}`

  useEffect(() => {
    let ativo = true

    fetch(`/api/comparar?a=${encodeURIComponent(par[0])}&b=${encodeURIComponent(par[1])}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (!ativo) return
        setDados(d)
        setErro(false)
        setCarregandoPar(null)
      })
      .catch(() => {
        if (!ativo) return
        setErro(true)
        setCarregandoPar(null)
      })

    return () => {
      ativo = false
    }
  }, [par])

  /* A lista de modelos é buscada uma vez: alimenta os dois seletores e não
     muda enquanto o painel está aberto. */
  useEffect(() => {
    let ativo = true
    fetch('/api/modelos')
      .then((r) => (r.ok ? r.json() : []))
      .then((l) => ativo && setOpcoes(l))
      .catch(() => {})
    return () => {
      ativo = false
    }
  }, [])

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
    }
    window.addEventListener('keydown', aoTeclar)

    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = anterior
    }
  }, [aoFechar])

  /* Troca um lado sem fechar o painel. Antes isto também espelhava a escolha
     numa barra do rodapé; a barra saiu junto com o fluxo de marcar-e-navegar,
     então resta só o par local. */
  const trocar = useCallback((lado: 0 | 1, slug: string) => {
    setPar((atual) => {
      if (atual[lado] === slug) return atual
      const novo: [string, string] = lado === 0 ? [slug, atual[1]] : [atual[0], slug]
      setCarregandoPar(`${novo[0]}|${novo[1]}`)
      return novo
    })
  }, [])

  const conteudo = (
    /*
      Sobreposicao e caixa, nao tela cheia.

      O painel ocupava `inset-0` com fundo solido: cobria o site inteiro e
      parecia outra pagina, quando e so uma consulta rapida sobre a pagina que
      a pessoa ja estava lendo. Agora o fundo escurece e desfoca — o contexto
      continua visivel atras — e a caixa cresce ate o conteudo, limitada a
      altura da janela. Clicar fora fecha, como o X.
    */
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-navy-900/70 p-4 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={aoFechar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.panelAria}
        /* Para o clique dentro da caixa nao fechar o painel. */
        onClick={(e) => e.stopPropagation()}
        className="my-auto flex max-h-[calc(100vh-2rem)] w-full max-w-[920px] flex-col overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-page)] shadow-[var(--shadow-lg)] sm:max-h-[calc(100vh-3rem)]"
      >
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-4 py-3 sm:px-6">
        <h1 className="font-display text-base font-semibold tracking-[var(--tracking-display)] text-[var(--text-strong)]">
          {t.barTitle}
        </h1>

        <div className="flex items-center gap-2">
          <IconButton rotulo={t.close} onClick={aoFechar}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </IconButton>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
        {erro ? (
          <p className="mx-auto max-w-md text-center text-sm text-[var(--text-muted)]">{t.noData}</p>
        ) : !dados ? (
          <Esqueleto />
        ) : (
          <div
            /* Esmaece durante a troca em vez de sumir: a tabela some por um
               instante e o painel saltaria de altura. */
            className={`mx-auto w-full transition-opacity duration-200 ${
              carregandoPar === chave ? 'opacity-50' : 'opacity-100'
            }`}
          >
            <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 sm:gap-4">
              <CabecalhoLado
                {...dados.a}
                outroSlug={dados.b.slug}
                opcoes={opcoes}
                aoTrocar={(s) => trocar(0, s)}
                locale={locale}
              />
              <div aria-hidden />
              <CabecalhoLado
                {...dados.b}
                outroSlug={dados.a.slug}
                opcoes={opcoes}
                aoTrocar={(s) => trocar(1, s)}
                locale={locale}
              />
            </div>

            <LinhasComparacao
              grupos={dados.grupos}
              caracteristicas={dados.caracteristicas}
              rotuloA={dados.a.rotulo}
              rotuloB={dados.b.rotulo}
              locale={locale}
            />

          </div>
        )}
      </div>
      </div>
    </div>
  )

  return createPortal(conteudo, document.body)
}

/** Forma final antes dos dados, para o painel não saltar quando chegam. */
function Esqueleto() {
  return (
    <div className="mx-auto w-full animate-pulse">
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        {[0, 1].map((i) => (
          <div key={i}>
            <div className="aspect-[4/3] rounded-[var(--radius-md)] bg-[var(--surface-sunken)]" />
            <div className="mt-3 h-5 w-2/3 rounded bg-[var(--surface-sunken)]" />
          </div>
        ))}
      </div>
      <div className="mt-8 space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 rounded bg-[var(--surface-sunken)]" />
        ))}
      </div>
    </div>
  )
}
