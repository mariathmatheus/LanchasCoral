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

  async headers() {
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
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      /* Só o próprio domínio: as fotos agora moram em `/public/fotos`.
         `data:`/`blob:` seguem porque o next/image os usa no placeholder. */
      "img-src 'self' data: blob:",
      "media-src 'self'",
      "font-src 'self' data:",
      "connect-src 'self'",
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
