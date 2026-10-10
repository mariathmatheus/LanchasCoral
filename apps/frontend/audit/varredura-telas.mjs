/**
 * Varre rotas em varias larguras de celular e aponta o que vaza do viewport.
 *
 *   node audit/varredura-telas.mjs "/rota1,/rota2"
 *
 * O que conta como defeito, e por que:
 *
 *  - ARRASTA: o documento rola para o lado. Um unico elemento que ultrapasse
 *    a largura faz a pagina inteira escorregar sob o dedo.
 *  - FORA: um controle (link, botao, campo) cujo retangulo passa da borda.
 *    So reporta o que esta DENTRO do viewport verticalmente e nao tem um
 *    ancestral com rolagem propria — carrossel e tabela de comparacao rolam
 *    de proposito.
 *  - ALVO: controle menor que 44x44, o minimo das WCAG para toque. Ignora os
 *    que estao dentro de texto corrido (links inline), onde a regra nao vale.
 *  - SOBREPOE: dois controles que se cobrem, sinal de layout quebrado.
 */
import { chromium } from 'playwright'

/* As rotas chegam SEM a barra inicial e separadas por virgula — o Git Bash no
   Windows converte um argumento que comece com "/" num caminho do sistema.
   Ex.: node audit/varredura-telas.mjs "home,modelos,contato" */
const ROTAS = (process.argv[2] ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
  .map(s => (s === 'home' ? '/' : '/' + s.replace(/^\/+/, '')))
const BASE = 'https://lanchascoral.com.br'
const TELAS = [
  ['iPhone SE', 375, 667, 2],
  ['Galaxy S20', 360, 800, 3],
  ['iPhone 13', 390, 844, 3],
  ['Pixel 5', 393, 851, 2.75],
  ['iPhone 14 PM', 430, 932, 3],
  ['estreito', 320, 568, 2],
]

const DETECTOR = () => {
  const tela = document.documentElement.clientWidth
  const alturaVis = window.innerHeight
  const achados = []

  const temRolagemPropria = (el) => {
    let p = el.parentElement
    while (p && p !== document.body) {
      const ox = getComputedStyle(p).overflowX
      if (ox === 'auto' || ox === 'scroll') return true
      p = p.parentElement
    }
    return false
  }
  const descreve = (el) => {
    const t = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30)
    return `<${el.tagName.toLowerCase()}> ${t || '(sem texto)'}`
  }

  // 1. A pagina arrasta?
  const excesso = document.documentElement.scrollWidth - tela
  if (excesso > 0) {
    const culpados = []
    for (const el of document.querySelectorAll('*')) {
      const b = el.getBoundingClientRect()
      if (b.right > tela + 1 && b.width > 8 && !temRolagemPropria(el)) {
        culpados.push(descreve(el) + ` ate ${Math.round(b.right)}px`)
      }
    }
    achados.push({ tipo: 'ARRASTA', detalhe: `${excesso}px`, culpados: culpados.slice(0, 3) })
  }

  // 2. Controles fora da tela, ou pequenos demais
  const controles = [...document.querySelectorAll('a, button, input, select, textarea, [role="button"], [role="tab"]')]
  const vistos = []
  for (const el of controles) {
    const b = el.getBoundingClientRect()
    if (b.width === 0 || b.height === 0) continue              // escondido
    if (b.bottom < 0 || b.top > alturaVis * 6) continue        // muito abaixo, nao avaliado
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none') continue
    if (el.closest('[aria-hidden="true"]')) continue

    if ((b.right > tela + 1 || b.left < -1) && !temRolagemPropria(el)) {
      achados.push({ tipo: 'FORA', detalhe: descreve(el), onde: `${Math.round(b.left)}..${Math.round(b.right)} (tela ${tela})` })
    }

    // Alvo de toque: so para controles em bloco, nao links dentro de frase
    const inline = cs.display === 'inline' || el.closest('p, li, span')
    if (!inline && (b.width < 44 || b.height < 44) && b.width > 4) {
      achados.push({ tipo: 'ALVO', detalhe: descreve(el), onde: `${Math.round(b.width)}x${Math.round(b.height)}` })
    }
    vistos.push({ el, b })
  }

  // 3. Controles que se sobrepoem
  for (let i = 0; i < vistos.length; i++) {
    for (let j = i + 1; j < vistos.length; j++) {
      const a = vistos[i], c = vistos[j]
      if (a.el.contains(c.el) || c.el.contains(a.el)) continue
      const ix = Math.min(a.b.right, c.b.right) - Math.max(a.b.left, c.b.left)
      const iy = Math.min(a.b.bottom, c.b.bottom) - Math.max(a.b.top, c.b.top)
      if (ix > 8 && iy > 8) {
        achados.push({ tipo: 'SOBREPOE', detalhe: `${descreve(a.el)} sobre ${descreve(c.el)}`, onde: `${Math.round(ix)}x${Math.round(iy)}px` })
      }
    }
  }
  return achados
}

const nav = await chromium.launch()
let total = 0
for (const rota of ROTAS) {
  for (const [nome, w, h, dpr] of TELAS) {
    const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true })
    const pg = await ctx.newPage()
    await pg.addInitScript(() => {
      try { localStorage.setItem('coral_consentimento', JSON.stringify({ estatisticas: true, marketing: true, em: '2026-01-01T00:00:00.000Z', versao: 1 })) } catch {}
    })
    try {
      await pg.goto(`${BASE}${rota}?v=${Date.now()}${Math.random()}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await pg.waitForTimeout(2600)
      const achados = await pg.evaluate(DETECTOR)
      const unicos = []
      const chaves = new Set()
      for (const a of achados) {
        const k = a.tipo + '|' + a.detalhe
        if (!chaves.has(k)) { chaves.add(k); unicos.push(a) }
      }
      if (unicos.length) {
        console.log(`\n### ${rota}  [${nome} ${w}x${h}]`)
        for (const a of unicos.slice(0, 6)) {
          console.log(`  ${a.tipo.padEnd(9)} ${a.detalhe}${a.onde ? '  ' + a.onde : ''}${a.culpados ? '\n              ' + a.culpados.join('\n              ') : ''}`)
        }
        if (unicos.length > 6) console.log(`  (+${unicos.length - 6} semelhantes)`)
        total += unicos.length
      }
    } catch (e) {
      console.log(`\n### ${rota} [${nome}] FALHOU: ${String(e).split('\n')[0].slice(0, 80)}`)
      total++
    }
    await ctx.close()
  }
}
console.log(`\n=== ${ROTAS.length} rota(s) x ${TELAS.length} telas: ${total} apontamento(s) ===`)
await nav.close()
