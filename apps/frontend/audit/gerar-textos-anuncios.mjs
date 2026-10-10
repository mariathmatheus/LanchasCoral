/**
 * Da texto proprio aos anuncios do Broker.
 *
 * Duas coisas estavam erradas, e a segunda anulava a primeira:
 *
 *  1. A descricao gravada era despejo de campo — "Modelo:", "Motorizacao:",
 *     "Horas:" — e quatro anuncios nao tinham nada.
 *  2. `src/views/listing.tsx` filtra justamente essas linhas (REPETE_FICHA),
 *     porque elas duplicam a tabela ao lado. Resultado: a maioria das paginas
 *     renderizava ZERO paragrafo de descricao.
 *
 * Busca de seminovo e a de maior intencao de compra do site ("coral 36 usada",
 * "lancha 36 pes seminova") e era onde havia menos texto.
 *
 * O que este script escreve sai todo dos campos estruturados — ano, tamanho,
 * marca, motor, horas, combustivel, capacidade. Nao inventa historico de uso
 * ("sempre em marina seca", "unico proprietario"): isso so quem viu o barco
 * sabe, e e o que o estaleiro deve acrescentar pelo painel.
 *
 *   node --env-file=.env audit/gerar-textos-anuncios.mjs --simular
 */
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const SIMULAR = process.argv.includes('--simular')
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

/** As mesmas linhas que a pagina descarta por duplicarem a ficha. */
const REPETE_FICHA =
  /^(modelo|marca|motor|motoriza[çc][ãa]o|combust[íi]vel|horas?|ano|tamanho|capacidade|casco|de uso)\s*:/i

/** O que sobra da descricao atual depois de tirar o despejo de campo. */
function textoEditorial(desc) {
  if (!desc) return ''
  return desc
    .split(/\r?\n/)
    .filter((l) => l.trim() && !REPETE_FICHA.test(l.trim()))
    .join(' ')
    .trim()
}

const ehJet = (l) => /jet\s*ski|sea[\s-]?doo|rxt|gtr|gt r/i.test(l.title)

/** Só os dígitos das horas: o campo vem como "950 horas (aproximadamente)". */
function horasNum(h) {
  if (!h) return null
  const m = String(h).match(/\d[\d.]*/)
  return m ? Number(m[0].replace('.', '')) : null
}

/**
 * Título que alguém digita, não o código de estoque.
 * "Coral 36C [2023]" vira "Coral 36C 2023 — lancha 36 pés seminova".
 * O slug não muda: o que já está indexado continua valendo.
 */
function titulo(l) {
  const base = l.title.replace(/\s*\[\d{4}\]\s*$/, '').trim()
  if (ehJet(l)) return `${base}${l.year ? ` ${l.year}` : ''} — jet ski seminovo`
  const pes = l.sizeFt ? ` ${l.sizeFt} pés` : ''
  return `${base}${l.year ? ` ${l.year}` : ''} — lancha${pes} seminova`
}

function descricao(l) {
  const blocos = []
  const nome = l.title.replace(/\s*\[\d{4}\]\s*$/, '').trim()
  const h = horasNum(l.hours)

  // 1. O que é, em uma frase que resume o anúncio.
  const abre = [`A ${nome} é uma ${ehJet(l) ? 'moto aquática' : 'lancha'} seminova`]
  if (l.year) abre.push(`${l.year}`)
  if (l.sizeFt && !ehJet(l)) abre.push(`de ${l.sizeFt} pés`)
  if (l.brand) abre.push(`fabricada pela ${l.brand}`)
  blocos.push(abre.join(' ') + ', disponível no estoque do Coral Broker.')

  // 2. Motor e uso — o que o comprador de seminovo pergunta primeiro.
  const tec = []
  if (l.engine) tec.push(`Equipada com ${l.engine}`)
  /* O combustivel so entra se ainda nao estiver no nome do motor: varios
     vem como "... 270HP B3 diesel", e repetir dava "diesel a diesel". */
  const jaDizCombustivel =
    l.engine && l.fuel && l.engine.toLowerCase().includes(String(l.fuel).toLowerCase())
  if (l.fuel && !jaDizCombustivel) {
    tec.push(`${l.engine ? 'a ' : 'Motorização a '}${String(l.fuel).toLowerCase()}`)
  }
  if (h != null) {
    tec.push(
      h < 300
        ? `e com apenas ${h} horas de uso registradas — pouquíssimo rodado para a idade`
        : `e com ${h} horas de uso registradas`,
    )
  }
  if (tec.length) blocos.push(tec.join(' ') + '.')

  // 3. O que o próprio anúncio já dizia em prosa, se dizia.
  const editorial = textoEditorial(l.description)
  if (editorial.length > 30) blocos.push(editorial)

  // 4. Capacidade, quando informada.
  if (l.capacity) blocos.push(`Capacidade para ${l.capacity}.`)

  // 5. O que a intermediação do estaleiro significa — é o diferencial contra
  //    comprar de particular, e vale para todos os anúncios.
  blocos.push(
    'A negociação é intermediada pelo próprio estaleiro: a Coral acompanha a vistoria, ' +
      'a documentação e a transferência, do primeiro contato até a entrega das chaves. ' +
      'Agende uma visita ou um test drive com um consultor.',
  )

  return blocos.join('\n\n')
}

/* ------------------------------------------------------------------ main */

const listings = await prisma.listing.findMany({
  where: { published: true },
  select: {
    id: true, slug: true, title: true, description: true, year: true,
    sizeFt: true, brand: true, engine: true, fuel: true, hours: true,
    capacity: true, priceBrl: true,
  },
  orderBy: { priceBrl: 'desc' },
})

console.log(`${listings.length} anuncios publicados${SIMULAR ? ' — SIMULACAO' : ''}\n`)

let n = 0
for (const l of listings) {
  const novaDesc = descricao(l)
  const novoTitulo = titulo(l)

  if (SIMULAR) {
    console.log(`--- ${l.slug}`)
    console.log(`  titulo: ${l.title}`)
    console.log(`       -> ${novoTitulo}`)
    console.log(`  texto (${novaDesc.split(/\s+/).length} palavras):`)
    console.log(novaDesc.split('\n\n').map((p) => '    ' + p).join('\n\n'))
    console.log()
  } else {
    await prisma.listing.update({
      where: { id: l.id },
      data: { title: novoTitulo, description: novaDesc },
    })
  }
  n++
}

console.log(`${n} anuncios atualizados.`)
await prisma.$disconnect()
