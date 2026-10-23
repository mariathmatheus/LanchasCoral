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
  const desc = `${l.title}${price}. Pre-owned boat brokered by Coral.`
  return {
    title: l.title,
    description: desc,
    robots: l.unlisted ? { index: false, follow: false } : undefined,
    alternates: l.unlisted ? undefined : alternatesEn(`/broker/${l.slug}`, `/en/broker/${l.slug}`),
    openGraph: l.unlisted ? undefined : ogDeProduto({
      titulo: l.title,
      descricao: desc,
      url: `/en/broker/${l.slug}`,
      imagem: `/broker/${l.slug}/og`,
      locale: 'en_US',
    }),
    twitter: l.unlisted ? undefined : { card: 'summary_large_image', images: [`/broker/${l.slug}/og`] },
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
