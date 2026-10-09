/**
 * Traz as fotografias para dentro do projeto.
 *
 * O catálogo nasceu apontando para os WordPress antigos: `lanchascoral.com.br`,
 * `broker.lanchascoral.com.br` e `mariath.dev`. Enquanto aqueles servidores
 * respondem, o site funciona — e quando um sai do ar, as fotos somem. Foi o
 * que aconteceu com `mariath.dev`: 370 imagens do catálogo retornam erro em
 * produção hoje.
 *
 * Este script baixa o que ainda existe, converte para WebP no tamanho real de
 * exibição e reescreve as URLs do banco para caminhos locais. Depois dele o
 * site não depende de servidor de terceiro para mostrar uma lancha.
 *
 *   node audit/migrar-imagens.mjs            # baixa, converte e atualiza
 *   node audit/migrar-imagens.mjs --simular  # só relata, não grava nada
 *
 * O que NÃO faz: inventar imagem perdida. As que já não respondem são
 * relatadas por modelo, para o cliente repor pelo painel.
 */
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const SIMULAR = process.argv.includes('--simular')
const DESTINO = 'public/fotos'
const PUBLICO = '/fotos'

/* 2400px cobre o maior uso real — a galeria em tela cheia num monitor 2x — sem
   guardar os 4000px que a câmera entregou e que ninguém vê. */
const LARGURA_MAX = 2400
/* 82 é o ponto em que o WebP para de ganhar nitidez perceptível em fotografia;
   acima disso só cresce o arquivo. */
const QUALIDADE = 82

/* Mesmo adaptador que `src/lib/prisma.ts`: este projeto usa driver adapter,
   e sem ele o cliente recusa a conexao. */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

/** Nome estável a partir da URL de origem: reprocessar não duplica arquivo. */
function nomeDe(url) {
  const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 12)
  const base = path.basename(new URL(url).pathname, path.extname(new URL(url).pathname))
  const limpo = base
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return `${limpo || 'foto'}-${hash}.webp`
}

async function baixar(url) {
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CoralMigrator/1.0)' },
    signal: AbortSignal.timeout(45000),
  })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const buf = Buffer.from(await r.arrayBuffer())
  if (buf.length < 500) throw new Error('resposta vazia')
  return buf
}

async function converter(buf, destino) {
  const img = sharp(buf, { failOn: 'none' })
  const meta = await img.metadata()
  const precisaReduzir = (meta.width ?? 0) > LARGURA_MAX
  const saida = await img
    .rotate() // respeita o EXIF antes de descartá-lo
    .resize(precisaReduzir ? { width: LARGURA_MAX, withoutEnlargement: true } : undefined)
    .webp({ quality: QUALIDADE, effort: 5 })
    .toBuffer()
  if (!SIMULAR) fs.writeFileSync(destino, saida)
  return { bytes: saida.length, w: meta.width, h: meta.height, original: buf.length }
}

/* ------------------------------------------------------------------ main */

if (!SIMULAR) fs.mkdirSync(DESTINO, { recursive: true })

/** Todas as referências do banco, agrupadas por URL para baixar uma só vez. */
const refs = []
for (const r of await prisma.boatImage.findMany({ select: { id: true, url: true } }))
  refs.push({ tabela: 'boatImage', id: r.id, campo: 'url', url: r.url })
for (const r of await prisma.listingImage.findMany({ select: { id: true, url: true } }))
  refs.push({ tabela: 'listingImage', id: r.id, campo: 'url', url: r.url })
for (const r of await prisma.boat.findMany({ where: { heroImage: { not: null } }, select: { id: true, heroImage: true } }))
  refs.push({ tabela: 'boat', id: r.id, campo: 'heroImage', url: r.heroImage })
for (const r of await prisma.listing.findMany({ where: { heroImage: { not: null } }, select: { id: true, heroImage: true } }))
  refs.push({ tabela: 'listing', id: r.id, campo: 'heroImage', url: r.heroImage })
for (const r of await prisma.article.findMany({ where: { heroImage: { not: null } }, select: { id: true, heroImage: true } }))
  refs.push({ tabela: 'article', id: r.id, campo: 'heroImage', url: r.heroImage })

const remotas = refs.filter((r) => /^https?:\/\//.test(r.url))
const porUrl = new Map()
for (const r of remotas) {
  if (!porUrl.has(r.url)) porUrl.set(r.url, [])
  porUrl.get(r.url).push(r)
}

console.log(`referencias remotas: ${remotas.length} (${porUrl.size} arquivos distintos)`)
console.log(SIMULAR ? '--- SIMULACAO: nada sera gravado ---\n' : '')

const mapa = new Map() // url original -> caminho publico
const perdidas = []
let ok = 0
let bytesAntes = 0
let bytesDepois = 0

const urls = [...porUrl.keys()]
const LOTE = 6 // paralelismo modesto: não derruba o WordPress de origem

for (let i = 0; i < urls.length; i += LOTE) {
  await Promise.all(
    urls.slice(i, i + LOTE).map(async (url) => {
      const nome = nomeDe(url)
      const destino = path.join(DESTINO, nome)

      // Já convertido numa rodada anterior: aproveita.
      if (fs.existsSync(destino) && !SIMULAR) {
        mapa.set(url, `${PUBLICO}/${nome}`)
        ok++
        return
      }
      try {
        const buf = await baixar(url)
        const r = await converter(buf, destino)
        mapa.set(url, `${PUBLICO}/${nome}`)
        bytesAntes += r.original
        bytesDepois += r.bytes
        ok++
      } catch (e) {
        perdidas.push({ url, motivo: String(e.message).slice(0, 40) })
      }
    }),
  )
  const feitos = Math.min(i + LOTE, urls.length)
  if (feitos % 60 === 0 || feitos === urls.length) {
    console.log(`  ${feitos}/${urls.length} — ${ok} ok, ${perdidas.length} sem resposta`)
  }
}

console.log(`\nbaixadas e convertidas: ${ok}`)
if (bytesAntes) {
  const mb = (n) => (n / 1024 / 1024).toFixed(1)
  console.log(`peso: ${mb(bytesAntes)}MB -> ${mb(bytesDepois)}MB (${Math.round((1 - bytesDepois / bytesAntes) * 100)}% menor)`)
}
console.log(`sem resposta na origem: ${perdidas.length}`)

/* ------------------------------------------------ atualiza o banco */

if (!SIMULAR && mapa.size) {
  let atualizadas = 0
  for (const [url, lista] of porUrl) {
    const novo = mapa.get(url)
    if (!novo) continue
    for (const ref of lista) {
      await prisma[ref.tabela].update({ where: { id: ref.id }, data: { [ref.campo]: novo } })
      atualizadas++
    }
  }
  console.log(`referencias atualizadas no banco: ${atualizadas}`)
}

/* ------------------------------------------------ relatório do que falta */

if (perdidas.length) {
  const porModelo = new Map()
  for (const p of perdidas) {
    for (const ref of porUrl.get(p.url) ?? []) {
      const k = `${ref.tabela}`
      porModelo.set(k, (porModelo.get(k) ?? 0) + 1)
    }
  }
  console.log('\nreferencias que ficaram sem imagem, por tabela:')
  for (const [k, n] of porModelo) console.log(`  ${k}: ${n}`)
  fs.writeFileSync('audit/_imagens-perdidas.json', JSON.stringify(perdidas, null, 1))
  console.log('lista completa em audit/_imagens-perdidas.json')
}

await prisma.$disconnect()
