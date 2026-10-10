import { prisma } from '@/lib/prisma'
import { imagemSocial } from '@/lib/og-imagem'

/**
 * Capa do anúncio em JPEG 1200x630, para o card de compartilhamento.
 *
 * Serve as duas línguas: a fotografia não muda com o idioma, então
 * `/en/broker/<slug>` aponta para esta mesma rota em vez de duplicá-la.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const listing = await prisma.listing.findUnique({
    where: { slug },
    select: { heroImage: true, published: true },
  })
  if (!listing || !listing.published) return new Response('não encontrado', { status: 404 })
  return imagemSocial(listing.heroImage)
}
