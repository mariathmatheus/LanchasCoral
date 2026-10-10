import Image from 'next/image'

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
 * A troca é feita com DUAS `next/image` alternadas por CSS. O custo é uma tag
 * a mais no HTML, e só a visível é baixada — mas isso depende de NÃO haver
 * preload, e é a parte que estava errada.
 *
 * ## Por que não há `priority` aqui
 *
 * `priority` injeta um `<link rel="preload">` no `<head>`. O preload é
 * processado antes de qualquer layout e ignora CSS, então `sm:hidden` não o
 * alcança: as duas fotos eram baixadas em todo aparelho. Medido num Pixel 5
 * em 4G lento — retrato 77KB e paisagem 42KB, as duas, sempre.
 *
 * A documentação do Next 16 desaconselha preload exatamente neste caso
 * ("quando várias imagens podem ser o elemento de LCP dependendo do
 * viewport") e recomenda `fetchPriority` no lugar. O `priority` em si está
 * deprecado desde o Next 16.
 *
 * Sem preload, o `loading="lazy"` padrão resolve: o navegador vê que o
 * elemento oculto nunca entra no viewport e não busca o arquivo. Não troque
 * por `loading="eager"` — isso traz o download duplo de volta.
 *
 * `fetchPriority="high"` continua: ele prioriza a imagem na fila da rede sem
 * criar preload, que é exatamente o que se quer.
 *
 * Os arquivos são gerados por `audit/gerar-hero.mjs`.
 */
const PAISAGEM = '/brand/hero-home-1920.jpg'
const RETRATO = '/brand/hero-home-portrait-1170.jpg'

export default function HeroImage({ alt = '', className = '' }: { alt?: string; className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden bg-navy-900 ${className}`}>
      {/* Celular: recorte retrato. `sm:hidden` evita a busca do arquivo. */}
      <Image
        src={RETRATO}
        alt={alt}
        fill
        fetchPriority="high"
        quality={72}
        sizes="100vw"
        className="object-cover object-[52%_center] sm:hidden"
      />
      {/* Tablet e desktop: enquadramento paisagem. */}
      <Image
        src={PAISAGEM}
        alt={alt}
        fill
        fetchPriority="high"
        quality={72}
        sizes="100vw"
        className="hidden object-cover object-[68%_center] sm:block"
      />
    </div>
  )
}
