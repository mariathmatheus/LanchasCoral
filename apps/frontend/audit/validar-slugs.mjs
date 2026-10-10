/**
 * Valida cada slug publicado de ponta a ponta, contra o site no ar.
 *
 * Um slug que existe no banco mas devolve 404, ou que responde mas nao esta no
 * sitemap, ou cujo canonical aponta para outro lugar, e conteudo que o Google
 * nunca vai mostrar — e, em campanha paga, anuncio reprovado por destino
 * invalido. Cada verificacao abaixo corresponde a uma dessas falhas.
 *
 *   node --env-file=.env audit/validar-slugs.mjs [baseUrl]
 */
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const BASE = process.argv[2] ?? 'https://coral.nerdresolve.com'
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

const falhas = []
const erro = (slug, o, d) => falhas.push({ slug, o, d })

/** Uma requisicao, com o corpo quando precisar inspecionar o HTML. */
async function pegar(url, comCorpo = false) {
  try {
    const r = await fetch(url, {
      redirect: 'manual',
      headers: { 'User-Agent': 'CoralSlugValidator/1.0' },
      signal: AbortSignal.timeout(45000),
    })
    return { status: r.status, local: r.headers.get('location'), corpo: comCorpo ? await r.text() : '' }
  } catch (e) {
    return { status: 0, erro: String(e.message).slice(0, 60), corpo: '' }
  }
}

const achar = (html, re) => {
  const m = html.match(re)
  return m ? m[1] : null
}

console.log(`validando contra ${BASE}\n`)

/* ----------------------------------------------- o que o banco publica */

const [boats, listings, artigos] = await Promise.all([
  prisma.boat.findMany({ where: { published: true }, select: { slug: true, name: true, heroImage: true } }),
  prisma.listing.findMany({ where: { published: true }, select: { slug: true, title: true, heroImage: true } }),
  prisma.article.findMany({ where: { published: true }, select: { slug: true, title: true } }),
])

const ALVOS = [
  ...boats.map((b) => ({ tipo: 'modelo', slug: b.slug, nome: b.name, pt: `/modelos/${b.slug}`, en: `/en/models/${b.slug}` })),
  ...listings.map((l) => ({ tipo: 'anuncio', slug: l.slug, nome: l.title, pt: `/broker/${l.slug}`, en: `/en/broker/${l.slug}` })),
  ...artigos.map((a) => ({ tipo: 'artigo', slug: a.slug, nome: a.title, pt: `/dicas/${a.slug}`, en: `/en/tips/${a.slug}` })),
]

console.log(`${ALVOS.length} itens publicados: ${boats.length} modelos, ${listings.length} anuncios, ${artigos.length} artigos`)

/* ------------------------------------------------------------- sitemap */

const sm = await pegar(`${BASE}/sitemap.xml`, true)
if (sm.status !== 200) {
  console.log(`\nSITEMAP INACESSIVEL (${sm.status}) — abortando`)
  await prisma.$disconnect()
  process.exit(1)
}
const noSitemap = (caminho) => sm.corpo.includes(`${BASE}${caminho}<`) || sm.corpo.includes(`${BASE}${caminho}"`)

/* --------------------------------------------------- verificacao por item */

let ok = 0
const LOTE = 5

for (let i = 0; i < ALVOS.length; i += LOTE) {
  await Promise.all(
    ALVOS.slice(i, i + LOTE).map(async (a) => {
      let limpo = true
      const marcar = (o, d) => { limpo = false; erro(a.slug, o, d) }

      // 1. A rota PT responde 200?
      const pt = await pegar(`${BASE}${a.pt}`, true)
      if (pt.status !== 200) {
        marcar('rota PT nao responde 200', `${a.pt} -> ${pt.status}${pt.erro ? ' ' + pt.erro : ''}`)
        return
      }

      // 2. Canonical aponta para ela mesma?
      const canon = achar(pt.corpo, /<link rel="canonical" href="([^"]+)"/)
      if (!canon) marcar('sem canonical', a.pt)
      else if (canon !== `${BASE}${a.pt}`) marcar('canonical aponta para outra URL', `${a.pt} -> ${canon}`)

      // 3. Tem title e description proprios?
      const title = achar(pt.corpo, /<title>([^<]*)<\/title>/)
      if (!title || title === 'Lanchas Coral') marcar('title ausente ou generico', `${a.pt} -> "${title}"`)
      const desc = achar(pt.corpo, /<meta name="description" content="([^"]*)"/)
      if (!desc) marcar('sem meta description', a.pt)
      else if (desc.length < 50) marcar('description curta demais', `${a.pt} -> ${desc.length} chars`)

      // 4. Um h1, e nao zero nem dois.
      const h1s = (pt.corpo.match(/<h1[\s>]/g) || []).length
      if (h1s !== 1) marcar('quantidade de h1 errada', `${a.pt} -> ${h1s}`)

      // 5. Esta no sitemap?
      if (!noSitemap(a.pt)) marcar('fora do sitemap', a.pt)

      // 6. hreflang reciproco: declara a si e a outra lingua?
      /* Atributo HTML e case-insensitive e o Next emite `hrefLang` em camelCase;
         comparar minusculo acusava as 35 paginas como quebradas sem estarem. */
      const alternates = (pt.corpo.match(/<link rel="alternate"[^>]*>/gi) || []).join('').toLowerCase()
      const temPt = alternates.includes(`hreflang="pt-br" href="${BASE}${a.pt}"`.toLowerCase())
      const temEn = alternates.includes(`hreflang="en" href="${BASE}${a.en}"`.toLowerCase())
      if (!temPt) marcar('hreflang sem autorreferencia', a.pt)
      if (!temEn) marcar('hreflang nao declara o par EN', `${a.pt} -> esperado ${a.en}`)

      // 7. og:image presente e acessivel? (link sem preview morre no WhatsApp)
      const og = achar(pt.corpo, /<meta property="og:image" content="([^"]+)"/)
      if (!og) marcar('sem og:image', a.pt)
      else {
        const img = await pegar(og.startsWith('http') ? og : `${BASE}${og}`)
        if (img.status !== 200) marcar('og:image quebrada', `${a.pt} -> ${og.slice(-60)} (${img.status})`)
      }

      // 8. A rota EN responde, e com canonical proprio?
      const en = await pegar(`${BASE}${a.en}`, true)
      if (en.status !== 200) {
        marcar('rota EN nao responde 200', `${a.en} -> ${en.status}`)
      } else {
        const canonEn = achar(en.corpo, /<link rel="canonical" href="([^"]+)"/)
        if (canonEn && canonEn !== `${BASE}${a.en}`) {
          marcar('canonical EN aponta para o PT', `${a.en} -> ${canonEn}`)
        }
        if (achar(en.corpo, /<html lang="([^"]+)"/) !== 'en') marcar('lang do html errado na rota EN', a.en)
      }

      // 9. Imagens da pagina carregam? (confere a primeira do corpo)
      const primeira = achar(pt.corpo, /<img[^>]+src="([^"]+)"/)
      if (primeira) {
        const alvo = primeira.startsWith('http') ? primeira : `${BASE}${primeira.replace(/&amp;/g, '&')}`
        const im = await pegar(alvo)
        if (im.status !== 200) marcar('imagem da pagina nao carrega', `${a.pt} -> ${im.status}`)
      }

      if (limpo) ok++
    }),
  )
  process.stdout.write(`  ${Math.min(i + LOTE, ALVOS.length)}/${ALVOS.length}\r`)
}

/* ------------------------------------- o caminho inverso: sitemap -> banco */

const noXml = [...sm.corpo.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
const dinamicas = noXml.filter((u) => /\/(modelos|broker|dicas)\/[^/]+$/.test(u.replace(BASE, '')))
const conhecidas = new Set(ALVOS.map((a) => `${BASE}${a.pt}`))
for (const u of dinamicas) {
  if (!conhecidas.has(u)) erro('(sitemap)', 'URL no sitemap sem item publicado correspondente', u)
}

/* ------------------------------------------- slug morto deve dar 404 real */

for (const falso of ['/modelos/slug-inexistente', '/broker/slug-inexistente', '/dicas/slug-inexistente']) {
  const r = await pegar(`${BASE}${falso}`, true)
  if (r.status !== 404) erro('(404)', 'slug inexistente nao devolve 404', `${falso} -> ${r.status}`)
  else if (!/noindex/i.test(r.corpo)) erro('(404)', 'pagina 404 sem noindex', falso)
}

/* ---------------------------------------------------------------- saida */

console.log('\n')
if (!falhas.length) {
  console.log(`TUDO VALIDO: ${ok}/${ALVOS.length} itens passaram em todas as verificacoes.`)
} else {
  const porTipo = new Map()
  for (const f of falhas) porTipo.set(f.o, (porTipo.get(f.o) ?? 0) + 1)
  console.log(`${falhas.length} FALHAS em ${ALVOS.length} itens (${ok} limpos):\n`)
  for (const [o, n] of [...porTipo].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}x  ${o}`)
  console.log('\ndetalhe (ate 25):')
  for (const f of falhas.slice(0, 25)) console.log(`  [${f.slug}] ${f.o}\n        ${f.d}`)
}

await prisma.$disconnect()
process.exit(falhas.length ? 1 : 0)
