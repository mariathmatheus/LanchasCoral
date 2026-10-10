import type { Metadata } from 'next'
import { ogDeProduto } from '@/lib/og-imagem'
import BoatView from '@/views/modelo'
import SiteFooter from '@/components/SiteFooter'
import { getBoatBySlug, getBoatSlugs, boatLabel, localizeBoat } from '@/lib/queries'
import { alternatesEn } from '@/lib/alternates'

type Params = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  const slugs = await getBoatSlugs()
  return slugs.map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const raw = await getBoatBySlug(slug)
  if (!raw) return {}

  const boat = localizeBoat(raw, 'en')
  const label = boatLabel(boat)
  return {
    title: label,
    description: boat.tagline ?? `${label}: specifications, equipment and gallery.`,
    alternates: alternatesEn(`/modelos/${boat.slug}`, `/en/models/${boat.slug}`),
    openGraph: ogDeProduto({
      titulo: label,
      descricao: boat.seoDescription ?? boat.tagline ?? `Discover the ${label}.`,
      url: `/en/models/${boat.slug}`,
      // A fotografia nao muda com o idioma: aponta para a rota em portugues.
      imagem: `/modelos/${boat.slug}/og`,
      locale: 'en_US',
    }),
    twitter: { card: 'summary_large_image', images: [`/modelos/${boat.slug}/og`] },
  }
}

export default async function Page({ params }: Params) {
  const { slug } = await params
  return (
    <>
      <BoatView slug={slug} locale="en" />
      <SiteFooter locale="en" />
    </>
  )
}
