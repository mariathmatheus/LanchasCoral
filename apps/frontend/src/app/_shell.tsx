import { Montserrat, JetBrains_Mono } from 'next/font/google'
import JsonLd from '@/components/JsonLd'
import { organizationSchema, websiteSchema } from '@/lib/schema'
import { getTelefonesPublicados } from '@/lib/contatos'
import BotaoZap from '@/components/BotaoZap'
import Atribuicao from '@/components/Atribuicao'
import Consentimento from '@/components/Consentimento'
import './globals.css'

/**
 * Casca comum dos dois layouts raiz.
 *
 * O site tem DOIS root layouts, um por idioma (`(pt)` e `(en)`), para que cada
 * árvore sirva o seu próprio `<html lang>` já no HTML inicial. Antes havia um
 * único layout fixo em `pt-BR` e um script que corrigia o atributo depois da
 * hidratação: o visitante via o valor certo, mas o buscador e o leitor de tela
 * liam o documento servido, com o idioma errado.
 *
 * Tudo o que não depende do idioma vive aqui para não divergir entre os dois.
 */

// Apenas `latin`: `latin-ext` acrescenta glifos do leste europeu que o site
// (português e inglês) nunca usa, e cada peso vira um arquivo a mais.
// O peso 300 foi retirado por não aparecer em nenhuma classe do projeto.
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-montserrat',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const fontVars = `${montserrat.variable} ${jetbrains.variable}`

/**
 * Contêiner do Google Tag Manager.
 *
 * Fica numa variável de ambiente para que o site só carregue tag em produção:
 * rodar o contêiner em desenvolvimento encheria os relatórios de sessões que
 * não são de visitante nenhum. Ausente, nada é injetado.
 */
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID

export async function Shell({
  lang,
  children,
}: {
  lang: 'pt-BR' | 'en'
  children: React.ReactNode
}) {
  /* Telefones do banco para o JSON-LD da organização. É uma consulta por
     renderização de layout, mas as páginas do site são estáticas ou
     revalidadas: na prática ela roda no build e a cada revalidação, não a
     cada visita. */
  const telefones = await getTelefonesPublicados()
  return (
    // `suppressHydrationWarning`: o script abaixo tira a classe `no-js` antes
    // da hidratação, então o className que o React encontra no cliente difere
    // do que veio do servidor — divergência intencional, não um bug.
    <html lang={lang} className={`no-js ${fontVars}`} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col">
        {/* Remove `no-js` antes da pintura: com JS as animações de entrada
            assumem; sem JS o CSS mantém tudo visível. Fica DENTRO do <body>
            porque <script> filho direto de <html> é HTML inválido. Como é o
            primeiro nó do corpo, roda antes de qualquer conteúdo pintar. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.remove('no-js')`,
          }}
        />

        {/*
          Consent Mode v2 em estado NEGADO, antes de qualquer tag.

          Tem de rodar antes do Tag Manager: se o primeiro disparo sair sem
          consentimento declarado, o problema de LGPD nasce junto com a
          instalação. Com isto o GTM carrega sempre, mas sem permissão para
          gravar nada — as tags ficam esperando, e só disparam quando o banner
          (components/Consentimento.tsx) manda o `update`.

          `wait_for_update` dá meio segundo para a resposta de quem já decidiu
          numa visita anterior, evitando que a tag seja descartada por chegar
          antes da leitura do localStorage.
        */}
        {GTM_ID && (
          <script
            dangerouslySetInnerHTML={{
              __html:
                `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}` +
                `gtag('consent','default',{'analytics_storage':'denied','ad_storage':'denied',` +
                `'ad_user_data':'denied','ad_personalization':'denied','wait_for_update':500});`,
            }}
          />
        )}

        {/* O contêiner. Sem `NEXT_PUBLIC_GTM_ID` nada é injetado — é assim que
            desenvolvimento e pré-visualização não poluem os dados de produção. */}
        {GTM_ID && (
          <script
            dangerouslySetInnerHTML={{
              __html:
                `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});` +
                `var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';` +
                `j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;` +
                `f.parentNode.insertBefore(j,f)})(window,document,'script','dataLayer','${GTM_ID}');`,
            }}
          />
        )}
        {/* Identidade do estaleiro e do site: base do Knowledge Panel. */}
        <JsonLd data={[organizationSchema(telefones), websiteSchema()]} />
        {/* Grava a origem da visita na primeira pagina aberta — antes que a
            navegacao leve a query string embora. Nao renderiza nada. */}
        <Atribuicao />
        {children}
        {/* A escolha de cookies. Fica depois do conteúdo no DOM: é a última
            coisa que o leitor de tela encontra, e não atrapalha quem veio ler. */}
        <Consentimento locale={lang === 'en' ? 'en' : 'pt'} />
        {/* Atalho para o comercial, fixo em todas as paginas publicas. O
            painel administrativo o esconde pelo seu proprio layout: quem esta
            cadastrando barco nao precisa de um botao para falar com vendas. */}
        <BotaoZap locale={lang === 'en' ? 'en' : 'pt'} />
      </body>
    </html>
  )
}
