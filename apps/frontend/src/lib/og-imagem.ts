import 'server-only'
import sharp from 'sharp'
import fs from 'node:fs/promises'
import path from 'node:path'

/**
 * Converte a foto de capa na imagem que as redes sociais conseguem mostrar.
 *
 * ## O problema
 *
 * As 35 páginas de produto apontavam `og:image` direto para o `heroImage` do
 * banco, que desde a migração é sempre `.webp`. O gerador de pré-visualização
 * do WhatsApp trabalha com JPEG e PNG: em WebP ele desiste da imagem e mostra
 * só título, descrição e domínio. É exatamente nas páginas que vendem — e o
 * WhatsApp é como este público compartilha barco: o vendedor manda o link no
 * privado, o comprador reencaminha para quem decide junto.
 *
 * ## Por que uma rota, e não arquivos gerados no build
 *
 * Gerar `public/og/<slug>.jpg` por script dessincroniza no instante em que o
 * cliente publica um barco novo pelo painel: a URL por convenção devolveria
 * 404 até alguém rodar o script e refazer o deploy. Pior, com
 * `output: 'standalone'` o `public/` é assado na imagem Docker — o estado
 * velho iria ao ar junto. Lendo do banco a cada pedido, nunca desencontra.
 *
 * O custo é uma conversão por pedido, mitigado pelo cache de um ano: a imagem
 * só é pedida por robô de pré-visualização, não pelo visitante.
 */

/** O formato que as redes esperam. Fora disso, o card sai recortado. */
const LARGURA = 1200
const ALTURA = 630

export async function imagemSocial(caminhoPublico: string | null): Promise<Response> {
  if (!caminhoPublico || !caminhoPublico.startsWith('/')) {
    return new Response('sem imagem', { status: 404 })
  }

  /* O valor vem do banco, que o painel alimenta. Normalizar e exigir que o
     resultado continue dentro de `public/` impede que um caminho com `..`
     gravado por engano (ou de propósito) leia arquivo de fora. */
  const base = path.join(process.cwd(), 'public')
  const arquivo = path.normalize(path.join(base, caminhoPublico))
  if (!arquivo.startsWith(base)) return new Response('caminho inválido', { status: 400 })

  try {
    const original = await fs.readFile(arquivo)
    const jpeg = await sharp(original)
      /* `cover` + `attention` em vez de recorte centrado: cinco das fotos de
         capa são retratos, e cortar o meio de um 737x1600 descarta justamente
         a embarcação. O `attention` escolhe a região de maior contraste, que
         num barco contra o mar é o casco. */
      .resize(LARGURA, ALTURA, { fit: 'cover', position: sharp.strategy.attention })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer()

    return new Response(new Uint8Array(jpeg), {
      headers: {
        'Content-Type': 'image/jpeg',
        /* A URL muda junto com o arquivo (o nome carrega hash da origem), então
           o cache pode ser longo sem risco de servir capa trocada. */
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    /* Arquivo ausente ou ilegível. 404 em vez de 500: para o robô de
       pré-visualização é a mesma coisa, e um erro de servidor aqui poluiria o
       log com algo que não quebra página nenhuma. */
    return new Response('imagem não encontrada', { status: 404 })
  }
}

/**
 * O bloco `openGraph` completo de uma página de produto.
 *
 * Existe porque declarar `openGraph` numa página SUBSTITUI o do layout — não
 * mescla. As páginas de modelo e de anúncio declaravam só `title` e `images`,
 * e com isso perdiam `type`, `url`, `siteName` e `locale`, que o layout define.
 * Medido em produção: a página do Coral 40 servia og:title, og:description e
 * og:image, e nenhum dos outros quatro.
 */
export function ogDeProduto(opts: {
  titulo: string
  descricao: string
  /** Caminho da página, sem domínio. */
  url: string
  /** Rota que devolve o JPEG 1200x630. */
  imagem: string
  locale: 'pt_BR' | 'en_US'
  tipo?: 'website' | 'article'
}) {
  return {
    type: opts.tipo ?? 'website',
    locale: opts.locale,
    siteName: 'Lanchas Coral',
    url: opts.url,
    title: opts.titulo,
    description: opts.descricao,
    /* `width`/`height` declarados: sem eles o Facebook e o LinkedIn baixam a
       imagem para medir antes de decidir o formato do card, e no meio-tempo
       mostram o card pequeno. */
    images: [{ url: opts.imagem, width: LARGURA, height: ALTURA, alt: opts.titulo }],
  }
}
