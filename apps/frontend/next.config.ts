import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Empacota so o necessario para rodar, sem node_modules: a imagem
  // Docker fica pequena e o start nao depende de instalar dependencias.
  output: 'standalone',
  // Pede compressao gzip nas respostas. O servidor embutido do `next start`
  // ignora esta opcao nesta versao (verificado: nao devolve Content-Encoding),
  // mas ela vale quando a aplicacao roda atras de um proxy que a respeita.
  compress: true,

  images: {
    // Legacy media still served from the WordPress host during migration.
    /*
     * Nenhuma origem remota.
     *
     * O catalogo nasceu apontando para os WordPress antigos. Enquanto eles
     * respondiam o site funcionava; quando `mariath.dev` saiu do ar, 388 fotos
     * do catalogo passaram a devolver erro 500 em producao. As fotografias
     * foram trazidas para `/public/fotos` em WebP (`audit/migrar-imagens.mjs`)
     * e a lista fica vazia de proposito: servidor de terceiro nao volta a ser
     * dependencia do site sem uma decisao explicita.
     */
    remotePatterns: [],
    formats: ['image/avif', 'image/webp'],
    /*
     * Degraus intermediarios na escala de larguras.
     *
     * O Next escolhe, para cada imagem, o primeiro degrau >= a largura
     * necessaria. A escala padrao salta de 828 para 1080, e nesse vao caem
     * telas comuns: um celular de 480 CSS px em DPR 2 precisa de 960 e recebe
     * 1080 — 13% de bytes que ninguem ve.
     *
     * Medido pelo Lighthouse: a foto do hero vinha em 645x1282 para ser
     * exibida em 480x820, com 22KB de sobra. O 960 fecha exatamente esse vao.
     *
     * Os outros degraus seguem a mesma logica para os cartoes (que pedem
     * ~370 CSS px) e para telas grandes. Cada degrau e um arquivo a mais no
     * cache do servidor de imagens, entao sao poucos e escolhidos.
     */
    deviceSizes: [640, 750, 828, 960, 1080, 1200, 1440, 1920, 2048, 3840],
  },

  /**
   * Cabecalhos de seguranca.
   * O painel recebe tambem `noindex` e `no-store` — nada dele deve ser
   * indexado por buscadores nem ficar em cache de proxy.
   */
  /*
   * Não anuncia a tecnologia do servidor.
   *
   * `X-Powered-By: Next.js` entrega de graça a pilha e, por tabela, o conjunto
   * de vulnerabilidades conhecidas a testar primeiro. Não é uma proteção por
   * si só — quem procura descobre de outras formas —, mas é informação que
   * não há motivo para oferecer.
   */
  poweredByHeader: false,

  /**
   * Endereços do site antigo que o Google já indexou.
   *
   * O WordPress em lanchascoral.com.br publica as fichas em `/listings/<slug>`
   * e os contatos em `/nossos-contatos`. No site novo as mesmas páginas vivem
   * em `/modelos/<slug>` e `/contatos`, com os MESMOS slugs. Quando o domínio
   * apontar para cá, cada um desses endereços viraria 404 — e com ele some a
   * posição que a página já tem na busca, além dos links que apontam para ela
   * de fora.
   *
   * `permanent: true` emite 301: o Google transfere a autoridade da URL antiga
   * para a nova em vez de tratar como página nova. Um 302 pediria para ele
   * manter a antiga indexada, que é o oposto do que se quer numa migração.
   */
  async redirects() {
    return [
      // As 18 fichas de modelo. O slug é o mesmo dos dois lados.
      { source: '/listings/:slug', destination: '/modelos/:slug', permanent: true },
      { source: '/listings', destination: '/modelos', permanent: true },
      // O hub de contatos mudou de nome.
      { source: '/nossos-contatos', destination: '/contatos', permanent: true },
      // O WordPress servia tudo com barra final; o Next normaliza sozinho,
      // mas o /feed e o /comments/feed não existem aqui e devem sair do índice
      // apontando para algo útil em vez de 404.
      { source: '/feed', destination: '/dicas', permanent: true },
      { source: '/comments/feed', destination: '/dicas', permanent: true },
    ]
  },

  async headers() {
    /*
     * Hosts do Google Tag Manager, GA4, Google Ads e Meta Pixel.
     *
     * Enumerados um a um de proposito. O site coleta nome, e-mail e telefone
     * em sete formularios, e `connect-src 'self'` era a trava que impedia um
     * XSS de mandar esses dados para fora. Abrir `connect-src` devolve um
     * canal de saida a quem conseguir injetar script — o risco e real e foi
     * aceito para viabilizar a mensuracao de campanha.
     *
     * Duas consequencias praticas disso:
     *   - a lista nunca deve virar curinga (`*.google.com` inclui dominio de
     *     conteudo de terceiro; `https:` libera a internet inteira);
     *   - NADA disto entra no `cspAdmin`. O painel lista leads com dados
     *     pessoais e la a trava continua fechada.
     */
    const TAG = {
      script: [
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com',
        'https://www.googleadservices.com',
        'https://googleads.g.doubleclick.net',
        'https://connect.facebook.net',
      ],
      connect: [
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com',
        'https://*.google-analytics.com',
        'https://*.analytics.google.com',
        'https://stats.g.doubleclick.net',
        'https://www.google.com',
        'https://www.facebook.com',
        'https://graph.facebook.com',
      ],
      img: [
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com',
        'https://*.google-analytics.com',
        'https://www.google.com',
        'https://www.google.com.br',
        'https://googleads.g.doubleclick.net',
        'https://stats.g.doubleclick.net',
        'https://www.facebook.com',
      ],
      frame: [
        'https://www.googletagmanager.com',
        'https://td.doubleclick.net',
        'https://bid.g.doubleclick.net',
      ],
    }

    const base = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
    ]

    /*
     * Política de conteúdo do SITE PÚBLICO.
     *
     * Antes só o painel tinha CSP, sob o argumento de que uma política
     * restritiva quebraria o `next/image` e as fontes do Google. Medido no ar:
     * as fontes são servidas de `/_next/static/media` (next/font as embute no
     * próprio domínio) e o CSS também é local — nada vem do Google. As únicas
     * origens externas no HTML são imagens do WordPress antigo e links de
     * saída (wa.me, redes sociais), que `img-src` e a ausência de restrição a
     * navegação já cobrem.
     *
     * Sem CSP, um XSS que escapasse do React teria liberdade total para
     * exfiltrar dados de formulário. Com ela, `connect-src 'self'` barra o
     * envio para fora e `form-action 'self'` impede o sequestro do destino.
     *
     * `'unsafe-inline'` em script-src é necessário pelo mesmo motivo do
     * painel: o Next injeta hidratação em `<script>` inline sem nonce estável.
     */
    const cspPublico = [
      "default-src 'self'",
      /* Google Tag Manager e os pixels que ele carrega. Host a host, nunca
         curinga: `script-src https:` deixaria qualquer servidor do mundo
         injetar codigo nesta pagina. */
      `script-src 'self' 'unsafe-inline' ${TAG.script.join(' ')}`,
      "style-src 'self' 'unsafe-inline'",
      /* As fotos moram em `/public/fotos`; os hosts de tag entram por causa
         dos pixels 1x1 de conversao, que ainda chegam como <img> em navegador
         antigo. `data:`/`blob:` seguem para o placeholder do next/image. */
      `img-src 'self' data: blob: ${TAG.img.join(' ')}`,
      "media-src 'self'",
      "font-src 'self' data:",
      /* Por onde os eventos saem. Ver o aviso sobre exfiltracao acima. */
      `connect-src 'self' ${TAG.connect.join(' ')}`,
      /* O Preview do GTM e o remarketing do Ads abrem iframe; sem esta
         diretiva o `default-src 'self'` os bloqueia e parece que "o GTM nao
         funciona". */
      `frame-src 'self' ${TAG.frame.join(' ')}`,
      "form-action 'self'",
      /* O site não deve ser emoldurado por ninguém — mesma intenção do
         X-Frame-Options, na versão que os navegadores modernos respeitam. */
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join('; ')

    /*
     * Política de conteúdo do painel.
     *
     * Mais fechada que a do site público: aqui estão os dados sensíveis.
     *
     * `'unsafe-inline'` em script-src é necessário porque o Next injeta os
     * dados de hidratação em `<script>` inline sem nonce estável. Não torna a
     * política inútil: `form-action 'self'` impede que um script injetado
     * envie um formulário para fora, `connect-src 'self'` barra o envio dos
     * dados roubados, e `frame-ancestors 'none'` fecha o clickjacking.
     *
     * É defesa em profundidade, não a defesa principal — essa é o escape
     * correto na saída (ver `JsonLd.tsx`).
     */
    const cspAdmin = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      // As fotos sao locais desde a migracao para `/public/fotos`.
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join('; ')

    return [
      { source: '/:path*', headers: [...base, { key: 'Content-Security-Policy', value: cspPublico }] },
      {
        source: '/admin/:path*',
        headers: [
          ...base,
          { key: 'Content-Security-Policy', value: cspAdmin },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
    ]
  },
}

export default nextConfig
