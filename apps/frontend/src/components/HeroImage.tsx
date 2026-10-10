import { getImageProps } from 'next/image'

/**
 * Fotografia de fundo do hero.
 *
 * Substituiu o embed de vídeo do YouTube: o player entrava num iframe 16:9 que
 * não preenchia a área do hero e deixava faixas laterais, além de custar caro
 * no carregamento. Uma fotografia estática é o próprio elemento de LCP.
 *
 * São dois enquadramentos, não dois tamanhos:
 *  - retrato (1170x2000) no celular, onde o hero é bem mais alto que largo;
 *  - paisagem (2560x1707) a partir de `sm`.
 *
 * ## Por que `<picture>`, e não duas `next/image`
 *
 * O caminho óbvio — duas `<Image>` alternadas por `sm:hidden` — tem dois modos
 * de falha, e tropeçamos nos dois:
 *
 * Com `priority`, o Next injeta um `<link rel="preload">` por imagem. O
 * preload é processado antes do layout e ignora CSS, então as DUAS fotos eram
 * baixadas em todo aparelho. Medido num Pixel 5: retrato 77KB e paisagem
 * 42KB, sempre.
 *
 * Sem `priority`, o `loading="lazy"` padrão resolve o download duplo, mas a
 * foto visível passa a ser descoberta tarde — e ela É o elemento de LCP no
 * viewport que o Lighthouse usa. Medido: `lcp-discovery-insight` com nota
 * zero, apontando "LCP resources should not use loading=lazy".
 *
 * `<picture>` com `<source media>` resolve os dois: o navegador baixa só o
 * recorte que vai exibir, e o `<img>` é ansioso, descoberto no parse. Os dois
 * `<link rel="preload">` levam `media`, então cada aparelho preloada apenas
 * o seu — que é o que o preload deveria ter feito desde o início.
 *
 * O React 19 iça os `<link>` para o `<head>` sozinho, então eles podem ser
 * declarados aqui, junto do que descrevem.
 *
 * Um comentário antigo registrava que dentro de `<picture>` o Chrome não
 * registrava candidato a LCP. Aquele teste é anterior a três correções que
 * causavam `NO_LCP` na home por outros motivos (o `z-index:-30` da seção, o
 * scroll espúrio do carrossel e o `bg-clip-text` do h1), e não se reproduz.
 *
 * Os arquivos são gerados por `audit/gerar-hero.mjs`.
 */
const PAISAGEM = '/brand/hero-home-1920.jpg'
const RETRATO = '/brand/hero-home-portrait-1170.jpg'

/* `sm` do Tailwind. Declarado uma vez: as três ocorrências abaixo (duas no
   preload, uma no <source>) precisam concordar, senão um aparelho preloada um
   arquivo e exibe outro. */
const DESKTOP = '(min-width: 640px)'
const CELULAR = '(max-width: 639px)'

/*
 * `sizes` maior que a largura da tela, de proposito.
 *
 * O hero usa `object-fit: cover`, e o recorte retrato (1170x2000, proporcao
 * 0,585) e mais largo que o vao que preenche num celular (412x820, 0,502).
 * O cover escala pela ALTURA e corta as laterais — entao a largura de arquivo
 * necessaria e maior que a da tela.
 *
 * Medido num 412x820 em DPR 2: o cover precisa de 960px de largura, mas
 * `sizes="100vw"` pedia 824. O Next servia 828 e o navegador ampliava, com
 * perda de nitidez.
 *
 * 116vw da 956 fisicos, que cai no degrau 960 da escala — o arquivo exato de
 * que o cover precisa. Com 120vw o pedido ia a 989 e subia para 1080, 67KB
 * em vez de 48KB sem ganho nenhum de nitidez.
 *
 * O paisagem nao tem esse problema (e mais largo que alto em qualquer tela),
 * entao fica em 100vw.
 */
const LARGURA_RETRATO = '116vw'

export default function HeroImage({ alt = '', className = '' }: { alt?: string; className?: string }) {
  const comum = { alt, quality: 72 } as const

  const { props: paisagem } = getImageProps({ ...comum, sizes: '100vw', src: PAISAGEM, width: 2560, height: 1707 })
  const { props: retrato } = getImageProps({ ...comum, sizes: LARGURA_RETRATO, src: RETRATO, width: 1170, height: 2000 })

  return (
    <div className={`absolute inset-0 overflow-hidden bg-navy-900 ${className}`}>
      {/* Cada preload com o seu `media`: o aparelho busca um arquivo só. */}
      <link
        rel="preload"
        as="image"
        media={CELULAR}
        imageSrcSet={retrato.srcSet}
        imageSizes={LARGURA_RETRATO}
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        media={DESKTOP}
        imageSrcSet={paisagem.srcSet}
        imageSizes="100vw"
        fetchPriority="high"
      />

      <picture>
        <source media={DESKTOP} srcSet={paisagem.srcSet} sizes="100vw" />
        {/* O `<img>` carrega o retrato quando nenhum `<source>` casa, e é ele
            que o LCP mede. `eager` de propósito: é a maior imagem acima da
            dobra, e adiá-la é adiar a métrica.

            O recorte muda com o viewport porque agora é uma tag só: 52% no
            celular (retrato) e 68% a partir de `sm` (paisagem). */}
        <img
          {...retrato}
          alt={alt}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-[52%_center] sm:object-[68%_center]"
        />
      </picture>
    </div>
  )
}
