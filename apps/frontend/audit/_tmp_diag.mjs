import { chromium } from 'playwright'
const nav = await chromium.launch()

// --- A: botao de menu a 320px ---
const ctxA = await nav.newContext({ viewport:{width:320,height:568}, deviceScaleFactor:2, isMobile:true, hasTouch:true })
const pgA = await ctxA.newPage()
await pgA.addInitScript(() => { try { localStorage.setItem('coral_consentimento', JSON.stringify({estatisticas:true,marketing:true,em:'2026-01-01T00:00:00.000Z',versao:1})) } catch {} })
await pgA.goto('https://lanchascoral.com.br/modelos/coral-26?v='+Date.now(), { waitUntil:'domcontentloaded', timeout:60000 })
await pgA.waitForTimeout(2600)
console.log('=== A: botao menu @320 ===')
console.log(JSON.stringify(await pgA.evaluate(() => {
  const tela = document.documentElement.clientWidth
  const b = [...document.querySelectorAll('button')].find(e => (e.getAttribute('aria-label')||'').match(/Abrir menu/))
  const r = b.getBoundingClientRect()
  const cs = getComputedStyle(b)
  // sobe a arvore medindo quem passa da borda
  const cadeia = []
  let p = b
  while (p && p !== document.documentElement) {
    const pr = p.getBoundingClientRect(); const pcs = getComputedStyle(p)
    cadeia.push({ tag: p.tagName.toLowerCase(), cls: (typeof p.className==='string'?p.className:'').slice(0,70),
      esq: Math.round(pr.left), dir: Math.round(pr.right), larg: Math.round(pr.width),
      mr: pcs.marginRight, pr: pcs.paddingRight, pl: pcs.paddingLeft, ox: pcs.overflowX })
    p = p.parentElement
  }
  return { tela, scrollW: document.documentElement.scrollWidth,
    botao: { esq: Math.round(r.left), dir: Math.round(r.right), larg: Math.round(r.width), alt: Math.round(r.height), marginRight: cs.marginRight },
    cadeia }
}, null), null, 1))

// --- B: WhatsApp x galeria @430 ---
const ctxB = await nav.newContext({ viewport:{width:430,height:932}, deviceScaleFactor:3, isMobile:true, hasTouch:true })
const pgB = await ctxB.newPage()
await pgB.addInitScript(() => { try { localStorage.setItem('coral_consentimento', JSON.stringify({estatisticas:true,marketing:true,em:'2026-01-01T00:00:00.000Z',versao:1})) } catch {} })
await pgB.goto('https://lanchascoral.com.br/modelos/coral-26?v='+Date.now(), { waitUntil:'domcontentloaded', timeout:60000 })
await pgB.waitForTimeout(2600)
console.log('\n=== B: zap x galeria @430 ===')
console.log(JSON.stringify(await pgB.evaluate(() => {
  const zap = document.querySelector('[data-zap]')
  const zr = zap.getBoundingClientRect()
  const amp = [...document.querySelectorAll('button')].filter(e => (e.getAttribute('aria-label')||'').match(/Ampliar/))
  return {
    tela: document.documentElement.clientWidth, alturaVis: innerHeight,
    zap: { esq: Math.round(zr.left), dir: Math.round(zr.right), topo: Math.round(zr.top), base: Math.round(zr.bottom), z: getComputedStyle(zap).zIndex },
    ampliar: amp.map(e => { const r = e.getBoundingClientRect(); return {
      lbl: (e.getAttribute('aria-label')||'').slice(0,28),
      esq: Math.round(r.left), dir: Math.round(r.right), topo: Math.round(r.top), base: Math.round(r.bottom),
      larg: Math.round(r.width), alt: Math.round(r.height),
      cobre: Math.min(r.right,zr.right)-Math.max(r.left,zr.left) > 8 && Math.min(r.bottom,zr.bottom)-Math.max(r.top,zr.top) > 8 } }).slice(0,4),
  }
}, null), null, 1))
await nav.close()
