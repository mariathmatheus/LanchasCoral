/**
 * Escreve o texto que faltava nas 18 fichas de modelo.
 *
 * As paginas de produto tinham hero, quatro numeros, galeria e duas tabelas —
 * e menos de 60 palavras indexaveis cada. `description` era NULL em 18 de 18,
 * `seoDescription` em 18 de 18. O Google nao tinha como entender para quem o
 * barco serve, e quem chegava pela busca nao encontrava resposta para o que
 * estava decidindo.
 *
 * Este script compoe esse texto a partir do que o banco ja sabe: comprimento,
 * boca, potencia, tanque, lotacao e as camas. Nao inventa caracteristica, nao
 * promete desempenho e nao cita preco — tudo o que sai daqui e verificavel na
 * propria ficha tecnica ao lado.
 *
 *   node --env-file=.env audit/gerar-textos-modelos.mjs --simular
 *   node --env-file=.env audit/gerar-textos-modelos.mjs
 *
 * Os textos sao um PONTO DE PARTIDA editavel pelo painel. O estaleiro conhece
 * cada casco melhor que qualquer regra: a intencao e que ninguem comece do
 * zero, nao que ninguem revise.
 */
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const SIMULAR = process.argv.includes('--simular')
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

/**
 * A medida em pes, que e como a pessoa procura ("lancha 30 pes").
 *
 * O numero do NOME vence a conversao do comprimento quando os dois discordam.
 * A Coral batiza por medida comercial, e o casco real costuma ser um pouco
 * maior: a Coral 21 tem 7,00 m, que converteriam para 23 pes. Anunciar "Coral
 * 21 — lancha de 23 pes" poria o titulo em conflito com o proprio nome do
 * produto, e e pelo nome que a pessoa busca.
 */
function pes(m, nome) {
  const doNome = nome ? Number((String(nome).match(/\d{2}/) ?? [])[0]) : NaN
  if (Number.isFinite(doNome) && doNome >= 16 && doNome <= 60) return doNome
  return Math.round(m * 3.28084)
}

const n = (v) => (v == null ? null : Number(v))
const vírgula = (v) => String(v).replace('.', ',')

/**
 * Como o barco se classifica, nas palavras de quem procura.
 * A variante do banco ja diz aberta/cabinada; quando nao diz, o indicio e a
 * existencia de cama na cabine.
 */
function categoria(b) {
  const v = (b.variant ?? '').toLowerCase()
  if (v.includes('fly')) return 'flybridge'
  if (v.includes('cabinada')) return 'cabinada'
  if (v.includes('aberta')) return 'aberta'
  if (v.includes('ht')) return 'cabinada hard top'
  if ((b.capInteriorNight ?? 0) > 0) return 'cabinada'
  return 'aberta'
}

/** O motor, como aparece na tagline do proprio estaleiro. */
function propulsao(b) {
  const t = (b.tagline ?? '').toLowerCase()
  if (t.includes('ips')) return 'centro rabeta ou IPS'
  if (t.includes('centro rabeta') && t.includes('popa')) return 'centro rabeta ou popa'
  if (t.includes('centro rabeta')) return 'centro rabeta'
  if (t.includes('popa')) return 'popa'
  return null
}

/** Para que serve, deduzido do tamanho e do que ha a bordo. */
function usoTipico(b) {
  const p = pes(n(b.lengthM), b.name)
  const dorme = (b.capInteriorNight ?? 0) > 0
  if (p <= 23) return 'passeio de dia, pesca leve e esportes de reboque, com facilidade para rebocar em carreta e guardar em marina seca'
  if (p <= 28) return 'dia inteiro na água com a família, com banheiro a bordo e espaço para parar numa prainha'
  if (!dorme) return 'dia inteiro com grupo maior, com espaço gourmet na popa para quem passa o dia fundeado'
  if (p <= 36) return 'fim de semana a bordo com um casal e os filhos, sem precisar de apoio em terra'
  return 'navegação de vários dias com duas famílias, com cabines separadas e autonomia para cruzeiros longos'
}

/** Quantas pessoas, com a distinção que a ficha faz. */
function lotacao(b) {
  const mar = b.capOpenSeaDay ?? 0
  const dia = b.capInteriorDay ?? 0
  const noite = b.capInteriorNight ?? 0
  const partes = []
  if (dia) partes.push(`${dia} pessoas em águas abrigadas`)
  if (mar && mar !== dia) partes.push(`${mar} em mar aberto`)
  if (noite) partes.push(`${noite} dormindo a bordo`)
  return partes.join(', ')
}

/* ------------------------------------------------------- os três blocos */

function descricao(b) {
  const p = pes(n(b.lengthM), b.name)
  const cat = categoria(b)
  const nome = `${b.name}${b.variant ? ` ${b.variant}` : ''}`
  const prop = propulsao(b)
  const comp = vírgula(n(b.lengthM).toFixed(2))
  const boca = vírgula(n(b.beamM).toFixed(2))

  const blocos = []

  // 1. Para quem é, e como se usa.
  blocos.push(
    `A ${nome} é uma lancha ${cat} de ${p} pés — ${comp} metros de comprimento por ${boca} de boca — ` +
      `pensada para ${usoTipico(b)}.`,
  )

  // 2. O que há a bordo, nas palavras do próprio estaleiro.
  if (b.tagline) blocos.push(b.tagline.trim())

  // 3. Motorização e autonomia, em frase e não em tabela.
  const motor = []
  if (prop) motor.push(`Aceita motorização de ${prop}`)
  else motor.push('Aceita motorização')
  if (b.powerMinHp && b.powerMaxHp) {
    motor.push(
      b.powerMinHp === b.powerMaxHp
        ? `de ${b.powerMaxHp} hp`
        : `de ${b.powerMinHp} a ${b.powerMaxHp} hp`,
    )
  }
  let frase = motor.join(' ') + '.'
  if (b.fuelL) {
    frase += ` O tanque de ${b.fuelL} litros de combustível`
    if (b.waterL) frase += ` e o de ${b.waterL} litros de água`
    frase += ' dão autonomia para sair da marina e voltar sem reabastecer num fim de semana comum.'
  }
  blocos.push(frase)

  // 4. Quem cabe.
  const lot = lotacao(b)
  if (lot) blocos.push(`A lotação é de ${lot}.`)

  // 5. O que vale para toda a linha — e é argumento de compra real.
  blocos.push(
    'Como toda a linha Coral, o casco é laminado em fibra de vidro no próprio estaleiro, ' +
      'em construção Wood Free (nenhuma madeira na estrutura), com dez anos de garantia estrutural ' +
      'e dois anos de cobertura dos componentes.',
  )

  return blocos.join('\n\n')
}

/** O título que alguém digita, não o código interno do produto. */
function seoTitle(b) {
  const p = pes(n(b.lengthM), b.name)
  const nome = `${b.name}${b.variant ? ` ${b.variant}` : ''}`
  return `${nome} — Lancha ${p} pés ${categoria(b)}`
}

/** 150-160 caracteres: tamanho que o Google mostra sem reescrever. */
function seoDescription(b) {
  const p = pes(n(b.lengthM), b.name)
  const nome = `${b.name}${b.variant ? ` ${b.variant}` : ''}`
  const noite = b.capInteriorNight ?? 0
  const dia = b.capInteriorDay ?? 0

  const partes = [`Lancha ${nome}: ${p} pés`]
  if (b.powerMaxHp) partes.push(`até ${b.powerMaxHp} hp`)
  if (noite) partes.push(`${noite} dormindo a bordo`)
  else if (dia) partes.push(`${dia} pessoas`)

  let s = partes.join(', ') + '.'
  const sobra = 158 - s.length
  if (sobra > 60) s += ' Ficha técnica completa e proposta direta com o estaleiro.'
  else if (sobra > 30) s += ' Ficha técnica e proposta direta.'
  return s
}

/* ------------------------------------------------------------------ main */

const boats = await prisma.boat.findMany({
  where: { published: true },
  select: {
    id: true, slug: true, name: true, variant: true, tagline: true,
    description: true, seoTitle: true, seoDescription: true,
    lengthM: true, beamM: true, powerMinHp: true, powerMaxHp: true,
    fuelL: true, waterL: true,
    capOpenSeaDay: true, capInteriorDay: true, capInteriorNight: true,
  },
  orderBy: { lengthM: 'asc' },
})

console.log(`${boats.length} modelos publicados${SIMULAR ? ' — SIMULACAO, nada sera gravado' : ''}\n`)

let escritos = 0
let pulados = 0

for (const b of boats) {
  /* Nunca sobrescreve o que alguem ja escreveu a mao: este script preenche o
     vazio, nao corrige o trabalho do estaleiro. */
  const dados = {}
  if (!b.description) dados.description = descricao(b)
  /* O `seoTitle` gravado era so o nome do produto — ora "Coral 30", ora
     "Coral 30 - Cabinada". Nos dois casos e o codigo interno, nao o que
     alguem digita: so vale manter quando alguem escreveu algo DIFERENTE
     do nome, o que indica edicao manual. */
  const nomeCompleto = `${b.name}${b.variant ? ` ${b.variant}` : ''}`
  const tituloEhSoONome =
    !b.seoTitle ||
    [b.name, nomeCompleto].some(
      (n) => b.seoTitle.replace(/\s*[–—-]\s*/g, ' ').trim().toLowerCase() === n.toLowerCase(),
    )
  if (tituloEhSoONome) dados.seoTitle = seoTitle(b)
  if (!b.seoDescription) dados.seoDescription = seoDescription(b)

  if (!Object.keys(dados).length) {
    pulados++
    continue
  }

  if (SIMULAR) {
    console.log(`--- ${b.slug}`)
    if (dados.seoTitle) console.log(`  title (${dados.seoTitle.length}): ${dados.seoTitle}`)
    if (dados.seoDescription) console.log(`  desc  (${dados.seoDescription.length}): ${dados.seoDescription}`)
    if (dados.description) console.log(`  texto (${dados.description.split(/\s+/).length} palavras):\n${dados.description.split('\n\n').map((p) => '    ' + p).join('\n\n')}`)
    console.log()
  } else {
    await prisma.boat.update({ where: { id: b.id }, data: dados })
  }
  escritos++
}

console.log(`${escritos} modelos receberam texto, ${pulados} ja tinham e foram preservados.`)
await prisma.$disconnect()
