import type { Metadata } from 'next'
import { ogDeProduto } from '@/lib/og-imagem'
import ListingView from '@/views/listing'
import SiteFooter from '@/components/SiteFooter'
import { getListingBySlug, getListingSlugs } from '@/lib/queries'
import { brl } from '@/lib/format'
import { alternates } from '@/lib/alternates'

type Params = { params: Promise<{ slug: string }> }

/** Pré-renderiza cada anúncio publicado. */
export async function generateStaticParams() {
  const slugs = await getListingSlugs()
  return slugs.map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const l = await getListingBySlug(slug)
  if (!l) return {}

  const preco = l.priceBrl ? `, ${brl(l.priceBrl)}` : ''
  const desc = `${l.title}${preco}. Seminovo intermediado pelo Coral Broker.`
  return {
    title: l.title,
    description: desc,
    robots: l.unlisted ? { index: false, follow: false } : undefined,
    alternates: l.unlisted ? undefined : alternates(`/broker/${l.slug}`, `/en/broker/${l.slug}`),
    openGraph: l.unlisted ? undefined : ogDeProduto({
      titulo: l.title,
      descricao: desc,
      url: `/broker/${l.slug}`,
      imagem: `/broker/${l.slug}/og`,
      locale: 'pt_BR',
    }),
    twitter: l.unlisted ? undefined : { card: 'summary_large_image', images: [`/broker/${l.slug}/og`] },
  }
}

export default async function Page({ params }: Params) {
  const { slug } = await params
  return (
    <>
      <ListingView slug={slug} locale="pt" />
      <SiteFooter locale="pt" />
    </>
  )
}
