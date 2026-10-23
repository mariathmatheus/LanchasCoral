import { prisma } from './prisma'
import { toNum } from './format'

/** Filtro padrão para itens visíveis publicamente (publicado e não-não-listado). */
const VISIBLE = { published: true, unlisted: false } as const
/** Filtro para itens acessíveis por link direto (publicado, independente de unlisted). */
const ACCESSIBLE = { published: true } as const

/**
 * Famílias do menu, com os modelos publicados e listados de cada uma.
 *
 * Não listados ficam fora do menu — o ponto do recurso é não aparecer
 * em nenhuma superfície de navegação pública.
 */
export async function getNavFamilies() {
  return prisma.family.findMany({
    where: { boats: { some: VISIBLE } },
    orderBy: { order: 'asc' },
    include: {
      boats: {
        where: VISIBLE,
        orderBy: { order: 'asc' },
        select: { slug: true, name: true, variant: true },
      },
    },
  })
}

export async function getBoats() {
  return prisma.boat.findMany({
    where: VISIBLE,
    orderBy: { order: 'asc' },
    include: { family: true, images: { orderBy: { order: 'asc' }, take: 1 } },
  })
}

export async function getBoatBySlug(slug: string) {
  return prisma.boat.findUnique({
    where: { slug },
    include: {
      family: true,
      images: { orderBy: { order: 'asc' } },
      equipment: { orderBy: [{ panel: 'asc' }, { order: 'asc' }] },
    },
  })
}

/** Pré-renderiza só modelos visíveis publicamente; não listados renderizam on-demand. */
export async function getBoatSlugs() {
  return prisma.boat.findMany({ where: VISIBLE, select: { slug: true } })
}

/** Display label: "Coral 36 – Cabinada". */
export const boatLabel = (b: { name: string; variant?: string | null }) =>
  [b.name, b.variant].filter(Boolean).join(' – ')

/**
 * Families with their published, listed boats.
 * Powers the /modelos page — unlisted boats are excluded.
 */
export async function getFamiliesWithBoats() {
  return prisma.family.findMany({
    where: { boats: { some: VISIBLE } },
    orderBy: { order: 'asc' },
    include: {
      boats: {
        where: VISIBLE,
        orderBy: { order: 'asc' },
        include: { images: { orderBy: { order: 'asc' }, take: 1 } },
      },
    },
  })
}

/**
 * "Modelos próximos": the boats nearest in hull length, same family first.
 * Unlisted boats are excluded from suggestions.
 */
export async function getSiblingBoats(
  boat: { id: string; familyId: string | null; lengthM: unknown },
  take = 3,
) {
  const others = await prisma.boat.findMany({
    where: { ...VISIBLE, id: { not: boat.id } },
    orderBy: { order: 'asc' },
    include: { images: { orderBy: { order: 'asc' }, take: 1 } },
  })

  const len = toNum(boat.lengthM as never)

  return others
    .map((b) => {
      const bLen = toNum(b.lengthM as never)
      return {
        boat: b,
        sameFamily: boat.familyId !== null && b.familyId === boat.familyId,
        distance: len !== null && bLen !== null ? Math.abs(bLen - len) : Number.POSITIVE_INFINITY,
      }
    })
    .sort((a, b) =>
      a.sameFamily !== b.sameFamily ? Number(b.sameFamily) - Number(a.sameFamily) : a.distance - b.distance,
    )
    .slice(0, take)
    .map((x) => x.boat)
}

/**
 * Resolve os campos de texto de um barco para o idioma pedido.
 */
export function localizeBoat<
  T extends {
    variant: string | null
    variantEn?: string | null
    tagline: string | null
    taglineEn?: string | null
    description: string | null
    descriptionEn?: string | null
  },
>(boat: T, locale: 'pt' | 'en') {
  if (locale === 'pt') return boat
  return {
    ...boat,
    variant: boat.variantEn?.trim() || boat.variant,
    tagline: boat.taglineEn?.trim() || boat.tagline,
    description: boat.descriptionEn?.trim() || boat.description,
  }
}

/** Idem para um item de equipamento. */
export function localizeEquipment<T extends { text: string; textEn?: string | null }>(
  item: T,
  locale: 'pt' | 'en',
) {
  return locale === 'en' && item.textEn?.trim() ? { ...item, text: item.textEn } : item
}

/* ---------------- Coral Broker: seminovos ---------------- */

/** Anúncios visíveis publicamente (publicados e listados). */
export async function getListings() {
  return prisma.listing.findMany({
    where: VISIBLE,
    orderBy: [{ sold: 'asc' }, { order: 'asc' }],
    include: { images: { orderBy: { order: 'asc' }, take: 1 } },
  })
}

export async function getListingBySlug(slug: string) {
  return prisma.listing.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { order: 'asc' } },
      accessories: { orderBy: { order: 'asc' } },
    },
  })
}

/** Pré-renderiza só anúncios visíveis; não listados renderizam on-demand. */
export async function getListingSlugs() {
  return prisma.listing.findMany({ where: VISIBLE, select: { slug: true } })
}

/** Outros anúncios relacionados — exclui não listados. */
export async function getRelatedListings(id: string, take = 3) {
  return prisma.listing.findMany({
    where: { ...VISIBLE, sold: false, id: { not: id } },
    orderBy: { order: 'asc' },
    take,
    include: { images: { orderBy: { order: 'asc' }, take: 1 } },
  })
}

/** Facets para filtros do broker — exclui não listados. */
export async function getListingFacets() {
  const rows = await prisma.listing.findMany({
    where: VISIBLE,
    select: { brand: true, year: true, sizeFt: true, kind: true, engineType: true },
  })
  const uniq = <T,>(xs: (T | null)[]) => [...new Set(xs.filter((x): x is T => x != null))]
  return {
    brands: uniq(rows.map((r) => r.brand)).sort(),
    years: uniq(rows.map((r) => r.year)).sort((a, b) => b - a),
    sizes: uniq(rows.map((r) => r.sizeFt)).sort((a, b) => a - b),
    kinds: uniq(rows.map((r) => r.kind)).sort(),
    engineTypes: uniq(rows.map((r) => r.engineType)).sort(),
  }
}

/* ---------- Artigos (/dicas) ---------- */

export async function getArticles() {
  return prisma.article.findMany({
    where: { published: true },
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
  })
}

export async function getArticle(slug: string) {
  return prisma.article.findFirst({ where: { slug, published: true } })
}

/** Escolhe o idioma do artigo; campos vazios caem no português. */
export function localizeArticle<T extends {
  title: string; excerpt: string | null; body: string[]
  titleEn: string | null; excerptEn: string | null; bodyEn: string[]
}>(a: T, locale: 'pt' | 'en') {
  if (locale === 'pt') return { ...a, title: a.title, excerpt: a.excerpt, body: a.body }
  return {
    ...a,
    title: a.titleEn || a.title,
    excerpt: a.excerptEn || a.excerpt,
    body: a.bodyEn.length ? a.bodyEn : a.body,
  }
}

/**
 * Modelos que podem ter o memorial descritivo solicitado.
 * Exclui não listados — o formulário público não deve expor modelos privados.
 */
export async function getModelosComMemorial() {
  const boats = await prisma.boat.findMany({
    where: { ...VISIBLE, manualUrl: { not: null } },
    orderBy: [{ family: { order: 'asc' } }, { order: 'asc' }],
    select: { slug: true, name: true, variant: true, manualUrl: true },
  })
  return boats.map((b) => ({
    slug: b.slug,
    label: b.variant ? `${b.name} ${b.variant}` : b.name,
    manualUrl: b.manualUrl!,
  }))
}

// Exportado para uso nas views de detalhe (verifica se é acessível por link)
export { ACCESSIBLE }
