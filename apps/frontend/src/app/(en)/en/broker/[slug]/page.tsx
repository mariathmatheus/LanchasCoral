import type { Metadata } from 'next'
import { ogDeProduto } from '@/lib/og-imagem'
import ListingView from '@/views/listing'
import SiteFooter from '@/components/SiteFooter'
import { getListingBySlug, getListingSlugs } from '@/lib/queries'
import { brl } from '@/lib/format'
import { alternatesEn } from '@/lib/alternates'

type Params = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  const slugs = await getListingSlugs()
  return slugs.map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const l = await getListingBySlug(slug)
  if (!l) return {}

  const price = l.priceBrl ? `, ${brl(l.priceBrl)}` : ''
  return {
    title: l.title,
    description: `${l.title}${price}. Pre-owned boat brokered by Coral.`,
    alternates: alternatesEn(`/broker/${l.slug}`, `/en/broker/${l.slug}`),
    openGraph: ogDeProduto({
      titulo: l.title,
      descricao: `${l.title}${price}. Pre-owned boat brokered by Coral.`,
      url: `/en/broker/${l.slug}`,
      // Mesma fotografia nas duas linguas: reusa a rota em portugues.
      imagem: `/broker/${l.slug}/og`,
      locale: 'en_US',
    }),
    twitter: { card: 'summary_large_image', images: [`/broker/${l.slug}/og`] },
  }
}

export default async function Page({ params }: Params) {
  const { slug } = await params
  return (
    <>
      <ListingView slug={slug} locale="en" />
      <SiteFooter locale="en" />
    </>
  )
}
